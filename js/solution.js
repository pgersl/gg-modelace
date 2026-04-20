// ====================== COMPLETE SOLUTION ======================
import { ASSET_BASE } from './config.js';
import { futureValue, formatCZK, resolvePFFeeRate, resolveComFeeRate, resolveCryptoFeeRate } from './utils.js';
import { createDoughnutChart, createPortfolioLineChart, destroyIfExists } from './charts.js';

let pieChart  = null;
let lineChart = null;

function toggleVisibility(pPF, pCom, pCrypto) {
    document.getElementById('cardPFParams').classList.toggle('hidden', pPF <= 0);
    document.getElementById('cardComParams').classList.toggle('hidden', pCom <= 0);
    document.getElementById('cardCryptoParams').classList.toggle('hidden', pCrypto <= 0);
}

function buildAssetRow(asset, initInv, monthInv, totalFeeToPay, feeMethodText, effectiveMonthlyDeductionRate) {
    const startVal          = Math.max(0, (initInv - totalFeeToPay) * (1 - asset.spread));
    const monthlyFeeCZK     = monthInv * effectiveMonthlyDeductionRate;
    const netMonthlyInvestment = Math.max(0, (monthInv - monthlyFeeCZK) * (1 - asset.spread));

    const lumpRow = `<tr>
        <td>${asset.name}</td>
        <td>${formatCZK(initInv)}</td>
        <td>${feeMethodText}</td>
        <td>${formatCZK(totalFeeToPay)}</td>
        <td>${(asset.spread * 100).toFixed(1)} %</td>
        <td class="val-bold">${formatCZK(startVal)}</td>
    </tr>`;

    const regRow = `<tr>
        <td>${asset.name}</td>
        <td>${formatCZK(monthInv)}</td>
        <td>${monthlyFeeCZK > 0 ? formatCZK(monthlyFeeCZK) : '0 Kč'}</td>
        <td>${(asset.spread * 100).toFixed(1)} %</td>
        <td class="val-bold">${formatCZK(netMonthlyInvestment)}</td>
    </tr>`;

    return { lumpRow, regRow, startVal, netMonthlyInvestment };
}

function resolveFees(key, asset, feeTypePF, feeTypeCom, initInv, targets) {
    let upfrontFee = 0, totalFeeToPay = 0, effectiveMonthlyDeductionRate = 0, feeMethodText = '';

    if (key === 'btc' || key === 'eth') {
        upfrontFee    = targets[key] * asset.feeRate;
        totalFeeToPay = upfrontFee;
        feeMethodText = 'Plně předplacený';

    } else if (key === 'gold' || key === 'silver') {
        if (feeTypeCom === 'payg') {
            upfrontFee    = targets[key] * 0.01;
            totalFeeToPay = upfrontFee + (initInv - upfrontFee) * asset.feeRate;
            effectiveMonthlyDeductionRate = asset.feeRate;
            feeMethodText = 'Postupně splácený';
        } else {
            totalFeeToPay = targets[key] * asset.feeRate;
            feeMethodText = 'Plně předplacený';
        }

    } else if (key === 'pf') {
        if (feeTypePF === 'base') {
            totalFeeToPay = initInv * (asset.feeRate + 0.01);
            effectiveMonthlyDeductionRate = asset.feeRate + 0.01;
            feeMethodText = 'Základní';
        } else if (feeTypePF === 'partial') {
            upfrontFee    = targets[key] * 0.01;
            totalFeeToPay = upfrontFee + (initInv - upfrontFee) * (asset.feeRate + 0.005);
            effectiveMonthlyDeductionRate = asset.feeRate + 0.005;
            feeMethodText = 'Částečně předplacený';
        } else {
            totalFeeToPay = targets[key] * asset.feeRate;
            feeMethodText = 'Plně předplacený';
        }
    }

    return { totalFeeToPay, effectiveMonthlyDeductionRate, feeMethodText };
}

export function calculate() {
    const totalInit    = parseFloat(document.getElementById('totalInit').value)    || 0;
    const totalMonthly = parseFloat(document.getElementById('totalMonthly').value) || 0;
    const years        = parseFloat(document.getElementById('years').value)        || 0;

    const vGold   = document.getElementById('variantGold').value;
    const vSilver = document.getElementById('variantSilver').value;

    const pPF      = (parseFloat(document.getElementById('pctPF').value)          || 0) / 100;
    const pCom     = (parseFloat(document.getElementById('pctCom').value)         || 0) / 100;
    const pCrypto  = (parseFloat(document.getElementById('pctBTC').value)         || 0) / 100;
    const pGold    = (parseFloat(document.getElementById('pctGold').value)        || 0) / 100;
    const pBTCShare= (parseFloat(document.getElementById('pctBTCinCrypto').value) || 85) / 100;

    const feeTypePF  = document.getElementById('feeTypePF').value;
    const feeTypeCom = document.getElementById('feeTypeCom').value;

    toggleVisibility(pPF, pCom, pCrypto);

    const weights = {
        pf:     pPF,
        gold:   pCom * pGold,
        silver: pCom * (1 - pGold),
        btc:    pCrypto * pBTCShare,
        eth:    pCrypto * (1 - pBTCShare)
    };

    const targetCrypto = parseFloat(document.getElementById('targetBTC').value)  || 0;
    const targetPF     = parseFloat(document.getElementById('targetPF').value)   || 0;
    const targetCom    = parseFloat(document.getElementById('targetCom').value)  || 0;

    const targets = {
        pf:     targetPF,
        gold:   targetCom * pGold,
        silver: targetCom * (1 - pGold),
        btc:    targetCrypto * pBTCShare,
        eth:    targetCrypto * (1 - pBTCShare)
    };

    // Deep-clone assets and apply fee rates
    const assets = {
        pf:     { ...ASSET_BASE.pf },
        gold:   { ...ASSET_BASE[vGold] },
        silver: { ...ASSET_BASE[vSilver] },
        btc:    { ...ASSET_BASE.btc },
        eth:    { ...ASSET_BASE.eth }
    };

    assets.pf.feeRate                         = resolvePFFeeRate(targets.pf);
    assets.gold.feeRate = assets.silver.feeRate = resolveComFeeRate(targets.gold + targets.silver);
    assets.btc.feeRate  = assets.eth.feeRate    = resolveCryptoFeeRate(targetCrypto);

    // Build tables & projection
    let lumpHtml = '';
    let regHtml  = '';
    const labels       = [];
    const chartValue   = Array(years + 1).fill(0);
    const chartInvested= Array(years + 1).fill(0);

    for (let y = 0; y <= years; y++) {
        labels.push(`${y}. rok`);
        chartInvested[y] = totalInit + totalMonthly * 12 * y;
    }

    Object.keys(weights).forEach(key => {
        const w = weights[key];
        if (w <= 0) return;

        const asset    = assets[key];
        const initInv  = totalInit    * w;
        const monthInv = totalMonthly * w;

        const { totalFeeToPay, effectiveMonthlyDeductionRate, feeMethodText } =
            resolveFees(key, asset, feeTypePF, feeTypeCom, initInv, targets);

        const { lumpRow, regRow, startVal, netMonthlyInvestment } =
            buildAssetRow(asset, initInv, monthInv, totalFeeToPay, feeMethodText, effectiveMonthlyDeductionRate);

        lumpHtml += lumpRow;
        regHtml  += regRow;

        chartValue[0] += startVal;
        let currentVal = startVal;

        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                currentVal = currentVal * Math.pow(1 + asset.yield, 1 / 12) + netMonthlyInvestment;
            }
            chartValue[y] += currentVal;
        }
    });

    document.getElementById('lumpSumTable').innerHTML = lumpHtml;
    document.getElementById('regularTable').innerHTML = regHtml;

    const finalVal      = chartValue[years];
    const totalInvested = chartInvested[years];
    const totalProfit   = finalVal - totalInvested;

    document.getElementById('resInvested').innerText = formatCZK(totalInvested);
    document.getElementById('resFinal').innerText    = formatCZK(finalVal);
    document.getElementById('resProfit').innerText   = formatCZK(totalProfit);

    if (totalInvested > 0 && years > 0) {
        const totalYieldPct = (totalProfit / totalInvested) * 100;
        const paYield       = (Math.pow(finalVal / totalInvested, 1 / years) - 1) * 100;
        document.getElementById('resYield').innerText = `${totalYieldPct.toFixed(1)} % / ${paYield.toFixed(2)} % p.a.`;
    } else {
        document.getElementById('resYield').innerText = '0 % / 0 %';
    }

    // Charts
    destroyIfExists(pieChart);
    destroyIfExists(lineChart);

    pieChart = createDoughnutChart(
        'pieChart',
        ['Zlato', 'Stříbro', 'Bitcoin', 'Ethereum', 'Permanentní fond'],
        [weights.gold, weights.silver, weights.btc, weights.eth, weights.pf],
        ['#edc079', '#b2ab9e', '#ffa23c', '#B9C4DE', '#6d9f88']
    );

    lineChart = createPortfolioLineChart('lineChart', labels, chartValue, chartInvested);
}

export function initSolution() {
    document.querySelectorAll('#complete-solution input, #complete-solution select').forEach(el =>
        el.addEventListener('input', calculate)
    );
    calculate();
}
