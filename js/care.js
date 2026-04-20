// ====================== CLIENT CARE ======================
import { formatCZK } from './utils.js';
import { createDoughnutChart, createYieldBarChart, destroyIfExists } from './charts.js';

let carePortfolioChart = null;
let careYieldChart     = null;

const ASSET_COLORS = ['#edc079', '#b2ab9e', '#ffa23c', '#B9C4DE', '#6d9f88'];

function readAssets() {
    return [
        { name: 'Zlato',            invested: parseFloat(document.getElementById('totalInvestmentGold').value)   || 0, current: parseFloat(document.getElementById('currentValueGold').value)   || 0 },
        { name: 'Stříbro',          invested: parseFloat(document.getElementById('totalInvestmentSilver').value) || 0, current: parseFloat(document.getElementById('currentValueSilver').value) || 0 },
        { name: 'Bitcoin',          invested: parseFloat(document.getElementById('totalInvestmentBTC').value)    || 0, current: parseFloat(document.getElementById('currentValueBTC').value)    || 0 },
        { name: 'Ethereum',         invested: parseFloat(document.getElementById('totalInvestmentETH').value)    || 0, current: parseFloat(document.getElementById('currentValueETH').value)    || 0 },
        { name: 'Permanentní fond', invested: parseFloat(document.getElementById('totalInvestmentPF').value)     || 0, current: parseFloat(document.getElementById('currentValuePF').value)     || 0 }
    ];
}

export function calculateClientCare() {
    const assets = readAssets().map(a => ({
        ...a,
        profit: a.current - a.invested,
        yield:  a.invested > 0 ? (a.current - a.invested) / a.invested : 0
    }));

    const totalInvestment = assets.reduce((s, a) => s + a.invested, 0);
    const totalCurrent    = assets.reduce((s, a) => s + a.current,  0);
    const totalProfit     = totalCurrent - totalInvestment;
    const totalYield      = totalInvestment > 0 ? totalProfit / totalInvestment : 0;

    document.getElementById('careTotalInvestment').innerText = formatCZK(totalInvestment);
    document.getElementById('careCurrentValue').innerText    = formatCZK(totalCurrent);
    document.getElementById('careProfit').innerText          = formatCZK(totalProfit);
    document.getElementById('careYield').innerText           = `${(totalYield * 100).toFixed(1)} %`;

    // Table
    document.getElementById('careTable').innerHTML = assets.map(a => `
        <tr>
            <td>${a.name}</td>
            <td>${formatCZK(a.invested)}</td>
            <td>${formatCZK(a.current)}</td>
            <td style="color:${a.yield >= 0 ? 'var(--accent)' : 'var(--success)'}">${(a.yield * 100).toFixed(1)} %</td>
        </tr>
    `).join('');

    // Charts
    destroyIfExists(carePortfolioChart);
    carePortfolioChart = createDoughnutChart(
        'carePortfolioChart',
        assets.map(a => a.name),
        assets.map(a => a.current),
        ASSET_COLORS
    );

    const wrappedLabels = assets.map(a =>
        a.name === 'Permanentní fond' ? ['Permanentní', 'fond'] : a.name
    );

    destroyIfExists(careYieldChart);
    careYieldChart = createYieldBarChart(
        'careYieldChart',
        wrappedLabels,
        assets.map(a => a.yield * 100)
    );
}

export function initClientCare() {
    document.querySelectorAll('#client-care input').forEach(el =>
        el.addEventListener('input', calculateClientCare)
    );
    calculateClientCare();
}
