// ====================== PENSION COMPARISON ======================
import { ASSET_BASE } from './config.js';
import { futureValue, formatCZK, calculateAnnualizedYield, resolvePFFeeRate } from './utils.js';
import { createComparisonChart, destroyIfExists } from './charts.js';

let pensionLineChart = null;

export function calculatePensionComparison() {
    const pensionVal      = parseFloat(document.getElementById('pensionVal').value)                   || 0;
    const pensionLength   = parseFloat(document.getElementById('pensionLength').value)                || 0;
    const clientDeposit   = parseFloat(document.getElementById('pensionClientDeposit').value)         || 0;
    const employerDeposit = parseFloat(document.getElementById('pensionEmployerDeposit').value)       || 0;
    const stateDeposit    = parseFloat(document.getElementById('pensionStateDeposit').value)          || 0;
    const monthlyClient   = parseFloat(document.getElementById('pensionMonthlyClientDeposit').value)  || 0;
    const monthlyEmployer = parseFloat(document.getElementById('pensionMonthlyEmployerDeposit').value)|| 0;
    const years           = parseFloat(document.getElementById('pensionYears').value)                 || 0;
    const targetPF        = parseFloat(document.getElementById('pensionTargetPF').value)              || 0;

    const TAX = 0.15;

    // --- Tax deduction logic ---
    const yearlyClientDeposit = Math.round(clientDeposit / pensionLength);
    let yearlyTaxDeduction = 0;
    if      (yearlyClientDeposit >= 68400) yearlyTaxDeduction = 48000;
    else if (yearlyClientDeposit >= 20400) yearlyTaxDeduction = yearlyClientDeposit - 20400;

    const totalTaxDeductions    = yearlyTaxDeduction * pensionLength;
    const totalTaxDeductionsTax = totalTaxDeductions * TAX;
    const returnedClientDeposit = clientDeposit - totalTaxDeductionsTax;

    const totalDeposits    = clientDeposit + employerDeposit + stateDeposit;
    const yieldsBeforeTax  = pensionVal - totalDeposits;
    const yieldsAfterTax   = yieldsBeforeTax * (1 - TAX);
    const employerAfterTax = employerDeposit * (1 - TAX);
    const returnedAmount   = returnedClientDeposit + employerAfterTax + yieldsAfterTax;

    const yieldPA = calculateAnnualizedYield(totalDeposits, pensionVal, pensionLength);

    // --- New solution (PF/DIP) setup ---
    const pfFeeRate           = resolvePFFeeRate(targetPF);
    const entryFee            = targetPF * pfFeeRate;
    const pfInitialInvestment = Math.max(0, returnedAmount - entryFee);
    const pfYield             = ASSET_BASE.pf.yield;

    // --- Monthly state support ---
    let monthlyState = 0;
    if      (monthlyClient >= 500 && monthlyClient <= 1700) monthlyState = monthlyClient * 0.2;
    else if (monthlyClient > 1700)                          monthlyState = 340;

    const monthlyTotal   = monthlyClient + monthlyEmployer + monthlyState;
    const pfMonthlyTotal = monthlyClient + monthlyEmployer;

    const oldFuture  = futureValue(pensionVal, monthlyTotal, yieldPA, years);
    const newFuture  = futureValue(pfInitialInvestment, pfMonthlyTotal, pfYield, years);
    const difference = newFuture - oldFuture;

    // --- Summary cards ---
    document.getElementById('pensionOldStrategy').innerText       = formatCZK(oldFuture);
    document.getElementById('pensionNewStrategy').innerText       = formatCZK(newFuture);
    document.getElementById('pensionStrategyDifference').innerText= formatCZK(difference);
    document.getElementById('pensionTotalInvestment').innerText   = formatCZK(pensionVal + monthlyClient * 12 * years);

    // --- Tables ---
    document.getElementById('pensionComparisonTable').innerHTML = `
        <tr><td>Měsíční vklad klienta</td><td>${formatCZK(monthlyClient)}</td><td>${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Měsíční vklad zaměstnavatele</td><td>${formatCZK(monthlyEmployer)}</td><td>${formatCZK(monthlyEmployer)}</td></tr>
        <tr><td>Měsíční státní podpora</td><td>${formatCZK(monthlyState)}</td><td>0 Kč</td></tr>
        <tr><td><strong>Celkem</strong></td><td class="val-bold">${formatCZK(monthlyTotal)}</td><td class="val-bold">${formatCZK(pfMonthlyTotal)}</td></tr>
        <tr><td>Výnosnost</td><td>${(yieldPA * 100).toFixed(2)} % p.a.</td><td>${(pfYield * 100).toFixed(2)} % p.a.</td></tr>
        <tr><td><strong>Počáteční investice</strong></td><td class="val-bold">${formatCZK(pensionVal)}</td><td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
    `;

    document.getElementById('pensionClientInfoTable').innerHTML = `
        <tr><td>Vklady</td><td>${formatCZK(clientDeposit)}</td></tr>
        <tr><td>Roční vklad</td><td>${formatCZK(yearlyClientDeposit)}</td></tr>
        <tr><td>Roční daňový odvod</td><td>${formatCZK(yearlyTaxDeduction)}</td></tr>
        <tr><td>Úhrn daňových odvodů</td><td>${formatCZK(totalTaxDeductions)}</td></tr>
        <tr><td>Zdanění daňových odvodů</td><td>${formatCZK(totalTaxDeductionsTax)}</td></tr>
        <tr><td>Vráceno</td><td class="val-bold">${formatCZK(returnedClientDeposit)}</td></tr>
    `;

    document.getElementById('pensionEmployerInfoTable').innerHTML = `
        <tr><td>Vklady</td><td>${formatCZK(employerDeposit)}</td></tr>
        <tr><td>Zdanění (15%)</td><td>${formatCZK(employerDeposit * TAX)}</td></tr>
        <tr><td>Vráceno</td><td class="val-bold">${formatCZK(employerAfterTax)}</td></tr>
    `;

    document.getElementById('pensionYieldTable').innerHTML = `
        <tr><td>Výnosy před zdaněním</td><td>${formatCZK(yieldsBeforeTax)}</td></tr>
        <tr><td>Zdanění (15%)</td><td>${formatCZK(yieldsBeforeTax * TAX)}</td></tr>
        <tr><td>Výnosy po zdanění</td><td>${formatCZK(yieldsAfterTax)}</td></tr>
        <tr><td>Výnosnost</td><td class="val-bold">${(yieldPA * 100).toFixed(2)} % p.a.</td></tr>
    `;

    document.getElementById('pensionFinalReturn').innerHTML = `
        <tr><td><strong>Celkem vráceno</strong></td><td class="val-bold">${formatCZK(returnedAmount)}</td></tr>
    `;

    document.getElementById('dipInfoTable').innerHTML = `
        <tr><td>Cílová částka</td><td>${formatCZK(targetPF)}</td></tr>
        <tr><td>Vstupní poplatek (${(pfFeeRate * 100).toFixed(1)}%)</td><td>${formatCZK(entryFee)}</td></tr>
        <tr><td>Jednorázová investice</td><td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
    `;

    // --- Chart ---
    const labels      = [];
    const oldData     = [];
    const newData     = [];
    const investedData= [];

    for (let y = 0; y <= years; y++) {
        labels.push(`${y}. rok`);
        oldData.push(futureValue(pensionVal, monthlyTotal, yieldPA, y));
        newData.push(futureValue(pfInitialInvestment, pfMonthlyTotal, pfYield, y));
        investedData.push(pfInitialInvestment + pfMonthlyTotal * 12 * y);
    }

    destroyIfExists(pensionLineChart);
    pensionLineChart = createComparisonChart('pensionLineChart', labels, newData, oldData, investedData);
}

export function initPensionComparison() {
    document.querySelectorAll('#pension-comparison input').forEach(el =>
        el.addEventListener('input', calculatePensionComparison)
    );
    calculatePensionComparison();
}
