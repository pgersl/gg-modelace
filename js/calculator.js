// ====================== INVESTMENT CALCULATOR ======================
import { futureValue, formatCZK } from './utils.js';
import { createGrowthChart, destroyIfExists } from './charts.js';

let calcChart = null;

export function calculateInvestment() {
    const initial   = parseFloat(document.getElementById('calcInit').value)      || 0;
    const monthly   = parseFloat(document.getElementById('calcMonthly').value)   || 0;
    const yieldPA   = parseFloat(document.getElementById('calcYield').value)     || 0;
    const years     = parseFloat(document.getElementById('calcYears').value)     || 0;
    const inflation = parseFloat(document.getElementById('calcInflation').value) || 0;

    const nominalYield = yieldPA / 100;
    const realYield    = nominalYield - (inflation / 100);

    const totalInvested = initial + monthly * 12 * years;
    const finalValue    = futureValue(initial, monthly, realYield, years);
    const profit        = finalValue - totalInvested;
    const totalYield    = totalInvested > 0 ? (finalValue - totalInvested) / totalInvested : 0;

    document.getElementById('calcInvested').innerText    = formatCZK(totalInvested);
    document.getElementById('calcFinal').innerText       = formatCZK(finalValue);
    document.getElementById('calcProfit').innerText      = formatCZK(profit);
    document.getElementById('calcTotalYield').innerText  = `${(totalYield * 100).toFixed(2)} % / ${(realYield * 100).toFixed(2)} % p.a.`;

    document.getElementById('calcTable').innerHTML = `
        <tr>
            <td>${formatCZK(initial)}</td>
            <td>${formatCZK(monthly)}</td>
            <td>${years} let</td>
            <td>${yieldPA.toFixed(2)}</td>
            <td>${inflation.toFixed(2)}</td>
        </tr>
    `;

    const labels       = [];
    const valueData    = [];
    const investedData = [];

    for (let y = 0; y <= years; y++) {
        labels.push(`${y}. rok`);
        valueData.push(futureValue(initial, monthly, realYield, y));
        investedData.push(initial + monthly * 12 * y);
    }

    destroyIfExists(calcChart);
    calcChart = createGrowthChart('calcChart', labels, valueData, investedData, profit);
}

export function initCalculator() {
    document.querySelectorAll('#investment-calculator input').forEach(el =>
        el.addEventListener('input', calculateInvestment)
    );
    calculateInvestment();
}
