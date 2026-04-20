// ====================== MORTGAGE COMPARISON ======================
import { ASSET_BASE } from './config.js';
import { formatCZK } from './utils.js';
import { destroyIfExists } from './charts.js';

let mortgageLineChart = null;

/**
 * Standard annuity formula: minimum required monthly payment.
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function annuityPayment(principal, annualRate, years) {
    const r = annualRate / 12;
    const n = years * 12;
    if (r === 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Strategy A — Baseline: pay minimum annuity for the full term, nothing extra.
 */
function simulateBaseline(principal, annualRate, durationYears, minPayment) {
    const r = annualRate / 12;
    let balance = principal;
    let totalInterest = 0;
    let totalPrincipal = 0;
    const totalMonths = durationYears * 12;
    const yearlyData = [{ year: 0, balance, totalInterest: 0, totalPrincipal: 0 }];

    for (let m = 1; m <= totalMonths; m++) {
        const interestCharge  = balance * r;
        const principalCharge = Math.min(minPayment - interestCharge, balance);
        totalInterest  += interestCharge;
        totalPrincipal += principalCharge;
        balance        -= principalCharge;

        if (m % 12 === 0 || balance <= 0.01) {
            yearlyData.push({
                year:          Math.ceil(m / 12),
                balance:       Math.max(0, balance),
                totalInterest,
                totalPrincipal
            });
        }

        if (balance <= 0.01) break;
    }

    return {
        months:        totalMonths,
        totalPaid:     minPayment * totalMonths,
        totalInterest,
        yearlyData
    };
}

/**
 * Strategy B — Accelerated repayment: pay the full monthly budget against the loan.
 * Surplus over minimum goes directly to principal each month.
 */
function simulateAccelerated(principal, annualRate, monthlyBudget) {
    const r = annualRate / 12;
    let balance = principal;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let month = 0;
    const yearlyData = [{ year: 0, balance, totalInterest: 0, totalPrincipal: 0 }];

    while (balance > 0.01) {
        month++;
        const interestCharge  = balance * r;
        const principalCharge = Math.min(monthlyBudget - interestCharge, balance);

        if (principalCharge <= 0) break; // budget can't cover interest — unpayable

        totalInterest  += interestCharge;
        totalPrincipal += principalCharge;
        balance        -= principalCharge;

        if (month % 12 === 0 || balance <= 0.01) {
            yearlyData.push({
                year:          Math.ceil(month / 12),
                balance:       Math.max(0, balance),
                totalInterest,
                totalPrincipal
            });
        }
    }

    return {
        months:        month,
        totalPaid:     monthlyBudget * month,
        totalInterest,
        yearlyData
    };
}

/**
 * Strategy C — Invest & lump-sum payoff:
 * Pay minimum each month, invest the surplus at PF yield (7.9% p.a.).
 * When portfolio value >= remaining loan balance, execute lump-sum early payoff.
 */
function simulateInvestAndPayoff(principal, annualRate, durationYears, monthlyBudget, minPayment) {
    const monthlySurplus    = monthlyBudget - minPayment;
    const investYield       = ASSET_BASE.pf.yield;
    const monthlyInvestRate = Math.pow(1 + investYield, 1 / 12) - 1;

    const r = annualRate / 12;
    let loanBalance    = principal;
    let investValue    = 0;
    let totalInterest  = 0;
    let totalPrincipal = 0;
    let earlyRepaymentMonth = null;
    const maxMonths = durationYears * 12;

    const yearlyData = [{ year: 0, loanBalance, investValue, totalInterest: 0, totalPrincipal: 0, earlyRepayment: false }];

    for (let m = 1; m <= maxMonths; m++) {
        // Loan amortisation
        const interestCharge  = loanBalance * r;
        const principalCharge = Math.min(minPayment - interestCharge, loanBalance);
        totalInterest  += interestCharge;
        totalPrincipal += principalCharge;
        loanBalance    -= principalCharge;

        // Portfolio growth + monthly contribution
        investValue = investValue * (1 + monthlyInvestRate);
        if (monthlySurplus > 0) investValue += monthlySurplus;

        const isYearEnd = (m % 12 === 0);
        const canRepay  = investValue >= loanBalance && loanBalance > 0.01 && earlyRepaymentMonth === null;

        if (canRepay) {
            earlyRepaymentMonth = m;
            totalPrincipal += loanBalance;
            loanBalance     = 0;
        }

        if (isYearEnd || loanBalance <= 0.01) {
            yearlyData.push({
                year:          Math.ceil(m / 12),
                loanBalance:   Math.max(0, loanBalance),
                investValue,
                totalInterest,
                totalPrincipal,
                earlyRepayment: !!canRepay
            });
        }

        if (loanBalance <= 0.01) break;
    }

    const monthsActive        = earlyRepaymentMonth ?? maxMonths;
    const totalMinPayments    = minPayment * monthsActive;
    const totalInvestContribs = monthlySurplus > 0 ? monthlySurplus * monthsActive : 0;

    return {
        monthlySurplus,
        earlyRepaymentYear: earlyRepaymentMonth ? Math.ceil(earlyRepaymentMonth / 12) : null,
        totalPaid:          totalMinPayments + totalInvestContribs,
        totalInterest,
        yearlyData
    };
}

export function calculateMortgageComparison() {
    const loan     = parseFloat(document.getElementById('mortgageLoan').value)           || 0;
    const duration = parseFloat(document.getElementById('mortgageDuration').value)       || 0;
    const rate     = (parseFloat(document.getElementById('mortgageRate').value)          || 0) / 100;
    const budget   = parseFloat(document.getElementById('mortgageMonthlyDeposit').value) || 0;

    if (loan <= 0 || duration <= 0 || rate <= 0 || budget <= 0) return;

    const minPayment = annuityPayment(loan, rate, duration);

    if (budget < minPayment) {
        document.getElementById('mortgageComparisonTable').innerHTML = `
            <tr><td colspan="4" style="color:var(--success); text-align:center; padding:16px;">
                Měsíční rozpočet (${formatCZK(budget)}) je nižší než minimální splátka (${formatCZK(minPayment)}). Zvyšte rozpočet.
            </td></tr>`;
        return;
    }

    const stratA = simulateBaseline(loan, rate, duration, minPayment);
    const stratB = simulateAccelerated(loan, rate, budget);
    const stratC = simulateInvestAndPayoff(loan, rate, duration, budget, minPayment);

    const savingB    = stratA.totalPaid - stratB.totalPaid;
    const savingC    = stratA.totalPaid - stratC.totalPaid;
    const bestSaving = Math.max(savingB, savingC);

    // --- Update summary card labels and values ---
    const cards = document.querySelectorAll('#mortgage-comparison .stat-card');
    if (cards[0]) cards[0].children[0].innerText = 'Celkové náklady (bez akce)';
    if (cards[1]) cards[1].children[0].innerText = 'Celkové náklady (zrychlené)';
    if (cards[2]) cards[2].children[0].innerText = 'Celkové náklady (s investicí)';
    if (cards[3]) cards[3].children[0].innerText = 'Nejlepší úspora';

    document.getElementById('mortgageEarlyRepayment').innerText     = formatCZK(stratA.totalPaid);
    document.getElementById('mortgageOldStrategy').innerText        = formatCZK(stratB.totalPaid);
    document.getElementById('mortgageNewStrategy').innerText        = formatCZK(stratC.totalPaid);
    document.getElementById('mortgageStrategyDifference').innerText = formatCZK(bestSaving);

    // --- Comparison table: 3 strategy columns ---
    const yearsB = Math.ceil(stratB.months / 12);
    const yearsC = stratC.earlyRepaymentYear;

    document.getElementById('mortgageComparisonTable').innerHTML = `
        <tr>
            <td>Měsíční splátka</td>
            <td>${formatCZK(minPayment)}</td>
            <td>${formatCZK(budget)}</td>
            <td>${formatCZK(minPayment)}</td>
        </tr>
        <tr>
            <td>Měsíční investice</td>
            <td>—</td>
            <td>—</td>
            <td>${formatCZK(stratC.monthlySurplus)}</td>
        </tr>
        <tr>
            <td>Doba splacení</td>
            <td>${duration} let</td>
            <td>${yearsB} let</td>
            <td>${yearsC ? yearsC + ' let' : duration + ' let (nesplaceno)'}</td>
        </tr>
        <tr>
            <td>Celkové úrokové náklady</td>
            <td>${formatCZK(stratA.totalInterest)}</td>
            <td>${formatCZK(stratB.totalInterest)}</td>
            <td>${formatCZK(stratC.totalInterest)}</td>
        </tr>
        <tr>
            <td><strong>Celkové náklady</strong></td>
            <td>${formatCZK(stratA.totalPaid)}</td>
            <td>${formatCZK(stratB.totalPaid)}</td>
            <td>${formatCZK(stratC.totalPaid)}</td>
        </tr>
        <tr>
            <td><strong>Úspora oproti základu</strong></td>
            <td>—</td>
            <td class="val-bold" style="color:var(--accent)">${formatCZK(savingB)}</td>
            <td class="val-bold" style="color:var(--accent)">${formatCZK(savingC)}</td>
        </tr>
    `;

    // --- Detail table 1: accelerated repayment schedule ---
    document.getElementById('mortgageInfo1Table').innerHTML = stratB.yearlyData
        .filter(d => d.year !== undefined)
        .map(d => `
            <tr style="${d.earlyRepayment ? 'background-color:#6d9f8820; font-weight:600;' : ''}">
                <td>${d.year}. rok</td>
                <td>${formatCZK(d.balance)}</td>
                <td>${formatCZK(d.totalInterest)}</td>
                <td>${formatCZK(d.totalPrincipal)}</td>
            </tr>
        `).join('');

    // --- Detail table 2: invest + lump-sum schedule ---
    document.getElementById('mortgageInfo2Table').innerHTML = stratC.yearlyData
        .filter(d => d.year !== undefined)
        .map(d => `
            <tr style="${d.earlyRepayment ? 'background-color:#6d9f8820; font-weight:600;' : ''}">
                <td>${d.year}. rok</td>
                <td>${formatCZK(d.loanBalance)}</td>
                <td>${formatCZK(d.totalInterest)}</td>
                <td>${formatCZK(d.totalPrincipal)}</td>
                <td>${formatCZK(d.investValue)}</td>
            </tr>
        `).join('');

    // --- Detail table 3: baseline / no action amortisation schedule ---
    document.getElementById('mortgageInfo3Table').innerHTML = stratA.yearlyData
        .filter(d => d.year !== undefined)
        .map(d => `
            <tr>
                <td>${d.year}. rok</td>
                <td>${formatCZK(d.balance)}</td>
                <td>${formatCZK(d.totalInterest)}</td>
                <td>${formatCZK(d.totalPrincipal)}</td>
            </tr>
        `).join('');

    // --- Chart: 4 lines across the longest timeline ---
    const allYears = Math.max(
        stratA.yearlyData.at(-1)?.year ?? 0,
        stratB.yearlyData.at(-1)?.year ?? 0,
        stratC.yearlyData.at(-1)?.year ?? 0
    );
    const labels = Array.from({ length: allYears + 1 }, (_, i) => `${i}. rok`);

    const mapA = new Map(stratA.yearlyData.map(d => [d.year, d]));
    const mapB = new Map(stratB.yearlyData.map(d => [d.year, d]));
    const mapC = new Map(stratC.yearlyData.map(d => [d.year, d]));

    const balanceA   = labels.map((_, y) => mapA.get(y)?.balance    ?? 0);
    const balanceB   = labels.map((_, y) => mapB.get(y)?.balance    ?? 0);
    const balanceC   = labels.map((_, y) => mapC.get(y)?.loanBalance ?? 0);
    const investData = labels.map((_, y) => {
        const pt = mapC.get(y);
        if (!pt) return null;
        // Stop drawing portfolio line once loan is repaid (except on the repayment year itself)
        if (pt.loanBalance <= 0.01 && !pt.earlyRepayment) return null;
        return pt.investValue;
    });

    destroyIfExists(mortgageLineChart);
    const ctx = document.getElementById('mortgageLineChart').getContext('2d');
    mortgageLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Zůstatek úvěru (bez akce)',
                    data: balanceA,
                    borderColor: '#45403a',
                    backgroundColor: '#45403a61',
                    tension: 0.1,
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 1.5
                },
                {
                    label: 'Zůstatek úvěru (zrychlené splácení)',
                    data: balanceB,
                    borderColor: '#cc331d',
                    backgroundColor: '#b84b4b6b',
                    tension: 0.1,
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 1.5
                },
                {
                    label: 'Hodnota investičního portfolia',
                    data: investData,
                    borderColor: '#6d9f88',
                    backgroundColor: '#6d9f8820',
                    tension: 0.1,
                    borderWidth: 3,
                    fill: false,
                    spanGaps: false,
                    pointRadius: 1.5
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { ticks: { callback: value => formatCZK(value) } }
            }
        }
    });
}

export function initMortgageComparison() {
    document.querySelectorAll('#mortgage-comparison input').forEach(el =>
        el.addEventListener('input', calculateMortgageComparison)
    );
    calculateMortgageComparison();
}