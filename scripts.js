Chart.defaults.font.family = "'Raleway', sans-serif";
Chart.defaults.color = '#45403a';

const ASSET_BASE = {
    pf: { yield: 0.0790, feeRate: 0, spread: 0, name: 'Permanentní fond' },
    gold_14oz: { yield: 0.1132, feeRate: 0, spread: 0.076, name: 'Zlato' },
    gold_1oz: { yield: 0.1132, feeRate: 0, spread: 0.076, name: 'Zlato' },
    gold_50g: { yield: 0.1132, feeRate: 0, spread: 0.078, name: 'Zlato' },
    silver_1kg: { yield: 0.1320, feeRate: 0, spread: 0.336, name: 'Stříbro' },
    silver_10oz: { yield: 0.1320, feeRate: 0, spread: 0.433, name: 'Stříbro' },
    btc: { yield: 0.1890, feeRate: 0, spread: 0.0800, name: 'Bitcoin' }
};

// SELECTION

const navButtons = document.querySelectorAll('.nav-button');
const mainGrids = document.querySelectorAll('.main-grid');
const sectionTitles = document.querySelectorAll('.title h1');

navButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        mainGrids.forEach(grid => grid.classList.remove('selected'));
        mainGrids[index].classList.add('selected');
        sectionTitles.forEach(title => title.style.display = 'none');
        sectionTitles[index].style.display = 'block';
        navButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// COMPLETE SOLUTION

let pieChart, lineChart;

function formatCZK(val) {
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val);
}

function toggleVisibility(pPF, pCom, pBTC) {
    document.getElementById('containerTargetPF').classList.toggle('hidden', pPF <= 0);
    document.getElementById('containerTargetCom').classList.toggle('hidden', pCom <= 0);
    document.getElementById('containerTargetBTC').classList.toggle('hidden', pBTC <= 0);
    
    document.getElementById('cardTargets').classList.toggle('hidden', (pPF + pCom + pBTC) <= 0);
    document.getElementById('cardComParams').classList.toggle('hidden', pCom <= 0);
}

function calculate() {
    const totalInit = parseFloat(document.getElementById('totalInit').value) || 0;
    const totalMonthly = parseFloat(document.getElementById('totalMonthly').value) || 0;
    const years = parseFloat(document.getElementById('years').value) || 0;
    const vGold = document.getElementById('variantGold').value;
    const vSilver = document.getElementById('variantSilver').value;
    const pPF = (parseFloat(document.getElementById('pctPF').value) || 0) / 100;
    const pCom = (parseFloat(document.getElementById('pctCom').value) || 0) / 100;
    const pBTC = (parseFloat(document.getElementById('pctBTC').value) || 0) / 100;
    const pGoldInCom = (parseFloat(document.getElementById('pctGold').value) || 0) / 100;
    toggleVisibility(pPF, pCom, pBTC);
    const weights = { pf: pPF, gold: pCom * pGoldInCom, silver: pCom * (1 - pGoldInCom), btc: pBTC };
    
    const currentAssets = {
        pf: {...ASSET_BASE.pf},
        gold: {...ASSET_BASE[vGold]},
        silver: {...ASSET_BASE[vSilver]},
        btc: {...ASSET_BASE.btc}
    };
    const targets = {
        pf: parseFloat(document.getElementById('targetPF').value) || 0,
        gold: (parseFloat(document.getElementById('targetCom').value) || 0) * pGoldInCom,
        silver: (parseFloat(document.getElementById('targetCom').value) || 0) * (1 - pGoldInCom),
        btc: parseFloat(document.getElementById('targetBTC').value) || 0
    };


    if (targets.pf >= 5000000) currentAssets.pf.feeRate = 0.02;
    else if (targets.pf >= 1000000) currentAssets.pf.feeRate = 0.03;
    else currentAssets.pf.feeRate = 0.04;
    if (targets.gold + targets.silver >= 1000000) {
        currentAssets.gold.feeRate = currentAssets.silver.feeRate = 0.03;
    } else if (targets.gold + targets.silver >= 700000) {
        currentAssets.gold.feeRate = currentAssets.silver.feeRate = 0.04;
    } else {
        currentAssets.gold.feeRate = currentAssets.silver.feeRate = 0.05;
    }
    if (targets.btc >= 1000000) currentAssets.btc.feeRate = 0.015;
    else if (targets.btc >= 500000) currentAssets.btc.feeRate = 0.02;
    else currentAssets.btc.feeRate = 0.03;
    
    let lumpHtml = '';
    let regHtml = '';
    let labels = [];
    let chartDataValue = Array(years + 1).fill(0);
    let chartDataInvested = Array(years + 1).fill(0);
    
    for(let y=0; y<=years; y++) {
        labels.push(`${y}. rok`);
        chartDataInvested[y] = totalInit + (totalMonthly * 12 * y);
    }
    
    Object.keys(weights).forEach(key => {
        const w = weights[key];
        if(w <= 0) return;
        const asset = currentAssets[key];
        const initInv = totalInit * w;
        const monthInv = totalMonthly * w;
        const fee = targets[key] * asset.feeRate;
        const startVal = Math.max(0, (initInv - fee) * (1 - asset.spread));
        const afterSpreadMonth = monthInv * (1 - asset.spread);
    
        lumpHtml += `<tr><td>${asset.name}</td><td>${formatCZK(initInv)}</td><td>${(asset.feeRate*100).toFixed(1)} %</td><td>${formatCZK(fee)}</td><td>${(asset.spread*100).toFixed(1)} %</td><td class="val-bold">${formatCZK(startVal)}</td></tr>`;
        regHtml += `<tr><td>${asset.name}</td><td>${formatCZK(monthInv)}</td><td>${(asset.spread*100).toFixed(1)} %</td><td class="val-bold">${formatCZK(afterSpreadMonth)}</td></tr>`;
        let currentVal = startVal;
        chartDataValue[0] += currentVal;
     
        for(let y=1; y<=years; y++) {
            const r = asset.yield;
            const m = afterSpreadMonth;
            currentVal = (currentVal * (1 + r)) + (m * ((Math.pow(1 + r/12, 12) - 1) / (r/12)));
            chartDataValue[y] += currentVal;
        }
    });
    
    document.getElementById('lumpSumTable').innerHTML = lumpHtml;
    document.getElementById('regularTable').innerHTML = regHtml;
    
    const finalVal = chartDataValue[years];
    const totalInvested = chartDataInvested[years];
    const totalProfit = finalVal - totalInvested;
    
    document.getElementById('resInvested').innerText = formatCZK(totalInvested);
    document.getElementById('resFinal').innerText = formatCZK(finalVal);
    document.getElementById('resProfit').innerText = formatCZK(totalProfit);
    
    if (totalInvested > 0 && years > 0) {
        const totalYieldPct = (totalProfit / totalInvested) * 100;
        const paYield = (Math.pow(finalVal / totalInvested, 1/years) - 1) * 100;
        document.getElementById('resYield').innerText = `${totalYieldPct.toFixed(1)} % / ${paYield.toFixed(2)} % p.a.`;
    } else {
        document.getElementById('resYield').innerText = "0 % / 0 %";
    }
    
    updateCharts(weights, labels, chartDataValue, chartDataInvested);
}

function updateCharts(weights, labels, dataVal, dataInv) {
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    
    if(pieChart) pieChart.destroy();
    
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Permanentní fond', 'Zlato', 'Stříbro', 'Bitcoin'],
            datasets: [{
                data: [weights.pf, weights.gold, weights.silver, weights.btc],
                backgroundColor: ['#6d9f88', '#edc079', '#b2ab9e', '#ffa23c'],
                borderWidth: 0
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    
    if(lineChart) lineChart.destroy();
    
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Celková hodnota', data: dataVal, borderColor: '#6d9f88', backgroundColor: '#6d9f883f', fill: 1, tension: 0.1, borderWidth: 1 },
                { label: 'Investované prostředky', data: dataInv, borderColor: '#45403a', backgroundColor: '#45403a61', fill: false, tension: 0.1, borderWidth: 1 }
            ]
        },
        options: { 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { ticks: { callback: value => formatCZK(value)}}}
        }
    });
}

document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', calculate));
window.onload = calculate;

// PENSION COMPARISON

let pensionLineChart;

function calculatePensionComparison() {

    const pensionVal = parseFloat(document.getElementById('pensionVal').value) || 0;
    const pensionLength = parseFloat(document.getElementById('pensionLength').value) || 0;

    const clientDeposit = parseFloat(document.getElementById('pensionClientDeposit').value) || 0;
    const employerDeposit = parseFloat(document.getElementById('pensionEmployerDeposit').value) || 0;
    const stateDeposit = parseFloat(document.getElementById('pensionStateDeposit').value) || 0;

    const monthlyClient = parseFloat(document.getElementById('pensionMonthlyClientDeposit').value) || 0;
    const monthlyEmployer = parseFloat(document.getElementById('pensionMonthlyEmployerDeposit').value) || 0;

    const years = parseFloat(document.getElementById('pensionYears').value) || 0;
    const targetPF = parseFloat(document.getElementById('pensionTargetPF').value) || 0;

    const TAX = 0.15;

    const yearlyClientDeposit = Math.round(clientDeposit / pensionLength)

    let yearlyTaxDeduction = 0

    if (yearlyClientDeposit >= 68400) {
        yearlyTaxDeduction = 48000
    } else if (yearlyClientDeposit >= 20400) {
        yearlyTaxDeduction = yearlyClientDeposit - 20400
    } else {
        yearlyTaxDeduction = 0
    }

    const totalTaxDeductions = yearlyTaxDeduction * pensionLength
    const totalTaxDeductionsTax = totalTaxDeductions * TAX
    const returnedClientDeposit = clientDeposit - totalTaxDeductionsTax

    const totalDeposits = clientDeposit + employerDeposit + stateDeposit;

    const yieldsBeforeTax = pensionVal - totalDeposits;
    const yieldsAfterTax = yieldsBeforeTax * (1 - TAX);

    const employerAfterTax = employerDeposit * (1 - TAX);

    const returnedAmount = returnedClientDeposit + employerAfterTax + yieldsAfterTax;

    const yieldPA =
        pensionLength > 0 && totalDeposits > 0
            ? Math.pow(pensionVal / totalDeposits, 1 / pensionLength) - 1
            : 0;

    let pfFeeRate = 0.04;
    if (targetPF >= 5000000) pfFeeRate = 0.02;
    else if (targetPF >= 1000000) pfFeeRate = 0.03;

    const entryFee = targetPF * pfFeeRate;
    const pfInitialInvestment = Math.max(0, returnedAmount - entryFee);

    const pfYield = ASSET_BASE.pf.yield;

    let monthlyState = 0

    if (monthlyClient >= 500 && monthlyClient <= 1700) {
        monthlyState = monthlyClient * 0.2
    } else if (monthlyClient > 1700) {
        monthlyState = 340
    } else {
        monthlyState = 0
    }

    const monthlyTotal = monthlyClient + monthlyEmployer + monthlyState;

    const pfMonthlyTotal = monthlyClient + monthlyEmployer;

    function futureValue(initial, monthly, r, years) {
        let value = initial;

        for (let y = 1; y <= years; y++) {
            value =
                value * (1 + r) +
                monthly * 12 *
                ((Math.pow(1 + r / 12, 12) - 1) / (r / 12));
        }

        return value;
    }

    const oldFuture = futureValue(pensionVal, monthlyTotal, yieldPA, years);
    const newFuture = futureValue(pfInitialInvestment, pfMonthlyTotal, pfYield, years);

    const difference = newFuture - oldFuture;

    document.getElementById('pensionOldStrategy').innerText = formatCZK(oldFuture);
    document.getElementById('pensionNewStrategy').innerText = formatCZK(newFuture);
    document.getElementById('pensionStrategyDifference').innerText = formatCZK(difference);
    document.getElementById('pensionTotalInvestment').innerText = formatCZK(pensionVal + monthlyClient * 12 * years);

    document.getElementById('pensionComparisonTable').innerHTML = `
        <tr><td>Měsíční vklad klienta</td><td>${formatCZK(monthlyClient)}</td><td>${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Měsíční vklad zaměstnavatele</td><td>${formatCZK(monthlyEmployer)}</td><td>${formatCZK(monthlyEmployer)}</td></tr>
        <tr><td>Měsíční státní podpora</td><td>${formatCZK(monthlyState)}</td><td>0 Kč</td></tr>
        <tr><td><strong>Celkem</strong></td><td class="val-bold">${formatCZK(monthlyTotal)}</td><td class="val-bold">${formatCZK(pfMonthlyTotal)}</td></tr>
        <tr><td>Výnosnost</td><td>${(yieldPA * 100).toFixed(2)} % p.a.</td><td>${(pfYield *100).toFixed(2)} % p.a.</td></tr>
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
        <tr><td><strong>Celkem vráceno</strong></td>
        <td class="val-bold">${formatCZK(returnedAmount)}</td></tr>
    `;

    document.getElementById('dipInfoTable').innerHTML = `
        <tr><td>Cílová částka</td><td>${formatCZK(targetPF)}</td></tr>
        <tr><td>Vstupní poplatek (${(pfFeeRate * 100).toFixed(1)}%)</td><td>${formatCZK(entryFee)}</td></tr>
        <tr><td>Jednorázová investice</td><td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
    `;

    const labels = [];
    const oldData = [];
    const newData = [];
    const investedData = [];

    for (let y = 0; y <= years; y++) {
        labels.push(`${y}. rok`);

        oldData.push(futureValue(pensionVal, monthlyTotal, yieldPA, y));
        newData.push(futureValue(pfInitialInvestment, monthlyTotal, pfYield, y));

        investedAmount = pfInitialInvestment + pfMonthlyTotal * 12 * y;

        investedData.push(investedAmount);
    }

    const ctx = document.getElementById('pensionLineChart').getContext('2d');

    if (pensionLineChart) pensionLineChart.destroy();

    pensionLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nové řešení',
                    data: newData,
                    borderColor: '#6d9f88',
                    backgroundColor: '#6d9f883f',
                    tension: 0.1,
                    borderWidth: 1,
                    fill: 1
                },
                {
                    label: 'Aktuální řešení',
                    data: oldData,
                    borderColor: '#cc331d',
                    backgroundColor: '#cc331d5f',
                    tension: 0.1,
                    borderWidth: 1,
                    fill: 2
                },
                {
                    label: 'Celková investice',
                    data: investedData,
                    borderColor: '#45403a',
                    backgroundColor: '#45403a61',
                    tension: 0,
                    borderWidth: 1,
                    fill: false
                },
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatCZK(value)
                    }
                }
            }
        }
    });
}

document.querySelectorAll(
    '#pension-comparison input'
).forEach(el => el.addEventListener('input', calculatePensionComparison));

calculatePensionComparison();

// BUILDING SAVINGS COMPARISON

let buildingLineChart;

function calculateBuildingSavingsComparison() {

    const buildingsVal = parseFloat(document.getElementById('buildingsVal').value) || 0;
    const buildingsLength = parseFloat(document.getElementById('buildingsLength').value) || 0;
    const buildingsTarget = parseFloat(document.getElementById('buildingsTarget').value) || 0;

    const clientDeposit = parseFloat(document.getElementById('buildingClientDeposit').value) || 0;
    const stateDeposit = parseFloat(document.getElementById('buildingStateDeposit').value) || 0;

    const monthlyClient = parseFloat(document.getElementById('buildingMonthlyClientDeposit').value) || 0;
    const years = parseFloat(document.getElementById('buildingYears').value) || 0;
    const targetPF = parseFloat(document.getElementById('buildingTargetPF').value) || 0;

    const penalty = buildingsTarget * 0.01;

    const returnedAmount = Math.max(0, buildingsVal - penalty - stateDeposit);

    const yields = buildingsVal - clientDeposit - stateDeposit;

    const monthlyState = Math.min(0.05 * monthlyClient, 1000 / 12);

    const monthlyTotal = monthlyClient + monthlyState;

    const totalDeposits = clientDeposit + stateDeposit;

    const yieldPA =
        buildingsLength > 0 && totalDeposits > 0
            ? Math.pow(buildingsVal / totalDeposits, 1 / buildingsLength) - 1
            : 0;

    let pfFeeRate = 0.04;
    if (targetPF >= 5000000) pfFeeRate = 0.02;
    else if (targetPF >= 1000000) pfFeeRate = 0.03;

    const entryFee = targetPF * pfFeeRate;
    const pfInitialInvestment = Math.max(0, returnedAmount - entryFee);

    const pfYield = ASSET_BASE.pf.yield;

    function futureValue(initial, monthly, r, years) {
        let value = initial;

        for (let y = 1; y <= years; y++) {
            value =
                value * (1 + r) +
                monthly * 12 *
                ((Math.pow(1 + r / 12, 12) - 1) / (r / 12));
        }

        return value;
    }

    const oldFuture = futureValue(buildingsVal, monthlyTotal, yieldPA, years);
    const newFuture = futureValue(pfInitialInvestment, monthlyClient, pfYield, years);

    const difference = newFuture - oldFuture;

    const totalInvestment = buildingsVal + monthlyClient * 12 * years;

    document.getElementById('buildingTotalInvestment').innerText = formatCZK(totalInvestment);
    document.getElementById('buildingOldStrategy').innerText = formatCZK(oldFuture);
    document.getElementById('buildingNewStrategy').innerText = formatCZK(newFuture);
    document.getElementById('buildingStrategyDifference').innerText = formatCZK(difference);

    document.getElementById('buildingComparisonTable').innerHTML = `
        <tr><td>Měsíční vklad klienta</td><td>${formatCZK(monthlyClient)}</td><td>${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Měsíční státní podpora</td><td>${formatCZK(monthlyState)}</td><td>0 Kč</td></tr>
        <tr><td><strong>Celkem</strong></td><td class="val-bold">${formatCZK(monthlyTotal)}</td><td class="val-bold">${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Výnosnost</td><td>${(yieldPA * 100).toFixed(2)} % p.a.</td><td>${(pfYield * 100).toFixed(2)} % p.a.</td></tr>
        <tr><td><strong>Počáteční investice</strong></td>
        <td class="val-bold">${formatCZK(buildingsVal)}</td>
        <td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
    `;

    document.getElementById('buildingClientInfoTable').innerHTML = `
        <tr><td>Cílová částka</td><td>${formatCZK(buildingsTarget)}</td></tr>
        <tr><td>Smluvní pokuta (1%)</td><td>${formatCZK(penalty)}</td></tr>
        <tr><td>Státní podpora</td><td>${formatCZK(stateDeposit)}</td></tr>
        <tr><td>Vráceno</td><td class="val-bold">${formatCZK(returnedAmount)}</td></tr>
    `;

    document.getElementById('buildingYieldTable').innerHTML = `
        <tr><td>Celkové vklady</td><td>${formatCZK(clientDeposit + stateDeposit)}</td></tr>
        <tr><td>Výnos</td><td>${formatCZK(yields)}</td></tr>
        <tr><td>Výnosnost</td><td class="val-bold">${(yieldPA * 100).toFixed(2)} % p.a.</td></tr>
    `;

    document.getElementById('buildingFinalReturn').innerHTML = `
        <tr><td><strong>Celkem k reinvestici</strong></td>
        <td class="val-bold">${formatCZK(returnedAmount)}</td></tr>
    `;

    document.getElementById('pfInfoTable').innerHTML = `
        <tr><td>Cílová částka</td><td>${formatCZK(targetPF)}</td></tr>
        <tr><td>Vstupní poplatek (${(pfFeeRate * 100).toFixed(1)}%)</td><td>${formatCZK(entryFee)}</td></tr>
        <tr><td>Jednorázová investice</td><td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
    `;

    const labels = [];
    const oldData = [];
    const newData = [];
    const investedData = [];

    for (let y = 0; y <= years; y++) {

        labels.push(`${y}. rok`);

        oldData.push(futureValue(buildingsVal, monthlyClient, yieldPA, y));
        newData.push(futureValue(pfInitialInvestment, monthlyClient, pfYield, y));

        const invested = pfInitialInvestment + monthlyClient * 12 * y;
        investedData.push(invested);
    }

    const ctx = document.getElementById('buildingLineChart').getContext('2d');

    if (buildingLineChart) buildingLineChart.destroy();

    buildingLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nové řešení',
                    data: newData,
                    borderColor: '#6d9f88',
                    backgroundColor: '#6d9f883f',
                    tension: 0.1,
                    borderWidth: 1,
                    fill: 1
                },
                {
                    label: 'Aktuální řešení',
                    data: oldData,
                    borderColor: '#cc331d',
                    backgroundColor: '#cc331d5f',
                    tension: 0.1,
                    borderWidth: 1,
                    fill: 2
                },
                {
                    label: 'Celková investice',
                    data: investedData,
                    borderColor: '#45403a',
                    backgroundColor:'#45403a61',
                    tension: 0,
                    borderWidth: 1,
                    fill: false
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatCZK(value)
                    }
                }
            }
        }
    });
}

document.querySelectorAll(
    '#building-savings-comparison input'
).forEach(el => el.addEventListener('input', calculateBuildingSavingsComparison));

calculateBuildingSavingsComparison();

// CLIENT CARE

let carePortfolioChart;
let careYieldChart;

function calculateClientCare() {

    const assets = [
        {
            name: 'Zlato',
            invested: parseFloat(document.getElementById('totalInvestmentGold').value) || 0,
            current: parseFloat(document.getElementById('currentValueGold').value) || 0
        },
        {
            name: 'Stříbro',
            invested: parseFloat(document.getElementById('totalInvestmentSilver').value) || 0,
            current: parseFloat(document.getElementById('currentValueSilver').value) || 0
        },
        {
            name: 'Bitcoin',
            invested: parseFloat(document.getElementById('totalInvestmentBTC').value) || 0,
            current: parseFloat(document.getElementById('currentValueBTC').value) || 0
        },
        {
            name: 'Permanentní fond',
            invested: parseFloat(document.getElementById('totalInvestmentPF').value) || 0,
            current: parseFloat(document.getElementById('currentValuePF').value) || 0
        }
    ];

    let totalInvestment = 0;
    let totalCurrent = 0;

    assets.forEach(asset => {
        totalInvestment += asset.invested;
        totalCurrent += asset.current;

        asset.profit = asset.current - asset.invested;
        asset.yield = asset.invested > 0
            ? asset.profit / asset.invested
            : 0;
    });

    const totalProfit = totalCurrent - totalInvestment;
    const totalYield = totalInvestment > 0
        ? totalProfit / totalInvestment
        : 0;

    document.getElementById('careTotalInvestment').innerText = formatCZK(totalInvestment);
    document.getElementById('careCurrentValue').innerText = formatCZK(totalCurrent);
    document.getElementById('careProfit').innerText = formatCZK(totalProfit);
    document.getElementById('careYield').innerText = (totalYield * 100).toFixed(1) + ' %';

    const tableBody = document.getElementById('careTable');
    tableBody.innerHTML = '';

    assets.forEach(asset => {

        const yieldPercent = (asset.yield * 100).toFixed(1);

        tableBody.innerHTML += `
            <tr>
                <td>${asset.name}</td>
                <td>${formatCZK(asset.invested)}</td>
                <td>${formatCZK(asset.current)}</td>
                <td style="color:${asset.yield >= 0 ? 'var(--accent)' : 'var(--success)'}">
                    ${yieldPercent} %
                </td>
            </tr>
        `;
    });

    const portfolioCtx = document.getElementById('carePortfolioChart').getContext('2d');

    if (carePortfolioChart) carePortfolioChart.destroy();

    carePortfolioChart = new Chart(portfolioCtx, {
        type: 'doughnut',
        data: {
            labels: assets.map(a => a.name),
            datasets: [{
                data: assets.map(a => a.current),
                backgroundColor: [
                    '#edc079',
                    '#b2ab9e',
                    '#ffa23c',
                    '#6d9f88'  
                ],
                borderWidth: 0
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    const yieldCtx = document.getElementById('careYieldChart').getContext('2d');

    if (careYieldChart) careYieldChart.destroy();

    const wrappedLabels = assets.map(a => {
        if (a.name === 'Permanentní fond') {
            return ['Permanentní', 'fond'];
        }
        return a.name;
    });

    careYieldChart = new Chart(yieldCtx, {
        type: 'bar',
        data: {
            labels: wrappedLabels,
            datasets: [{
                label: 'Zhodnocení (%)',
                data: assets.map(a => a.yield * 100),
                backgroundColor: assets.map(a =>
                    a.yield >= 0 ? '#6d9f88' : '#cc331d'
                )
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        minRotation: 0,
                        maxRotation: 0,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    ticks: {
                        callback: value => value + ' %'
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return '#000000';
                            }
                            return '#e0e0e0';
                        },
                        lineWidth: function(context) {
                            if (context.tick.value === 0) {
                                return 2;
                            }
                            return 1;
                        }
                    }
                }
            }
        }
    });
}

document.querySelectorAll('#client-care input')
    .forEach(el => el.addEventListener('input', calculateClientCare));

calculateClientCare();