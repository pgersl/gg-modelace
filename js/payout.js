// ====================== INFINITE PAYOUT ======================
import { futureValue, formatCZK } from './utils.js';
import { createGrowthChart, destroyIfExists } from './charts.js';

let payoutChart = null;

export function calculatePayout() {
    const monthlyPayout = parseFloat(document.getElementById('payoutVal').value)   || 0;
    const initial      = parseFloat(document.getElementById('payoutInit').value)  || 0;
    const yieldPA      = parseFloat(document.getElementById('payoutYield').value) || 0;
    const years        = parseFloat(document.getElementById('payoutYears').value) || 0;

    const r = yieldPA / 100;
    const annualPayout = monthlyPayout * 12;

    // Capital needed so that annual yield covers the payout indefinitely (perpetuity)
    const targetCapital = r > 0 ? annualPayout / r : 0;

    // FV of initial lump sum after `years`
    const fvInitial = initial * Math.pow(1 + r, years);

    // Remaining capital to be built by monthly contributions
    const remaining = Math.max(0, targetCapital - fvInitial);

    // Monthly rate
    const rMonthly = Math.pow(1 + r, 1 / 12) - 1;

    // Solve FV of annuity = remaining  →  monthly = remaining * rMonthly / ((1+rMonthly)^n - 1)
    const n = years * 12;
    const monthly = (rMonthly > 0 && n > 0)
        ? remaining * rMonthly / (Math.pow(1 + rMonthly, n) - 1)
        : (n > 0 ? remaining / n : 0);

    const finalValue    = futureValue(initial, monthly, r, years);
    const totalInvested = initial + monthly * 12 * years;
    const profit        = finalValue - totalInvested;

    document.getElementById('payoutInvested').innerText = formatCZK(totalInvested);
    document.getElementById('payoutFinal').innerText    = formatCZK(finalValue);
    document.getElementById('payoutTotal').innerText    = formatCZK(monthlyPayout);
    document.getElementById('payoutMonthly').innerText  = formatCZK(monthly);

    const labels       = [];
    const valueData    = [];
    const investedData = [];

    for (let y = 0; y <= years; y++) {
        labels.push(`${y}. rok`);
        valueData.push(futureValue(initial, monthly, r, y));
        investedData.push(initial + monthly * 12 * y);
    }

    destroyIfExists(payoutChart);
    payoutChart = createGrowthChart('payoutChart', labels, valueData, investedData, profit);
}

export function initPayout() {
    document.querySelectorAll('#infinite-payout input').forEach(el =>
        el.addEventListener('input', calculatePayout)
    );
    calculatePayout();
}