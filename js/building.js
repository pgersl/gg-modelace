// ====================== BUILDING SAVINGS COMPARISON ======================
import { ASSET_BASE } from './config.js';
import { futureValue, formatCZK, calculateAnnualizedYield, resolvePFFeeRate } from './utils.js';
import { createComparisonChart, destroyIfExists } from './charts.js';

let buildingLineChart = null;

export function calculateBuildingSavingsComparison() {
    const buildingsVal    = parseFloat(document.getElementById('buildingsVal').value)                || 0;
    const buildingsLength = parseFloat(document.getElementById('buildingsLength').value)             || 0;
    const buildingsTarget = parseFloat(document.getElementById('buildingsTarget').value)             || 0;
    const clientDeposit   = parseFloat(document.getElementById('buildingClientDeposit').value)       || 0;
    const stateDeposit    = parseFloat(document.getElementById('buildingStateDeposit').value)        || 0;
    const monthlyClient   = parseFloat(document.getElementById('buildingMonthlyClientDeposit').value)|| 0;
    const years           = parseFloat(document.getElementById('buildingYears').value)               || 0;
    const targetPF        = parseFloat(document.getElementById('buildingTargetPF').value)            || 0;

    const penalty        = buildingsTarget * 0.01;
    const returnedAmount = Math.max(0, buildingsVal - penalty - stateDeposit);
    const yields         = buildingsVal - clientDeposit - stateDeposit;
    const monthlyState   = Math.min(0.05 * monthlyClient, 1000 / 12);
    const monthlyTotal   = monthlyClient + monthlyState;
    const totalDeposits  = clientDeposit + stateDeposit;

    const yieldPA = calculateAnnualizedYield(totalDeposits, buildingsVal, buildingsLength);

    const pfFeeRate           = resolvePFFeeRate(targetPF);
    const entryFee            = targetPF * pfFeeRate;
    const pfInitialInvestment = Math.max(0, returnedAmount - entryFee);
    const pfYield             = ASSET_BASE.pf.yield;

    const oldFuture  = futureValue(buildingsVal, monthlyTotal, yieldPA, years);
    const newFuture  = futureValue(pfInitialInvestment, monthlyClient, pfYield, years);
    const difference = newFuture - oldFuture;

    // --- Summary cards ---
    document.getElementById('buildingTotalInvestment').innerText     = formatCZK(buildingsVal + monthlyClient * 12 * years);
    document.getElementById('buildingOldStrategy').innerText         = formatCZK(oldFuture);
    document.getElementById('buildingNewStrategy').innerText         = formatCZK(newFuture);
    document.getElementById('buildingStrategyDifference').innerText  = formatCZK(difference);

    // --- Tables ---
    document.getElementById('buildingComparisonTable').innerHTML = `
        <tr><td>Měsíční vklad klienta</td><td>${formatCZK(monthlyClient)}</td><td>${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Měsíční státní podpora</td><td>${formatCZK(monthlyState)}</td><td>0 Kč</td></tr>
        <tr><td><strong>Celkem</strong></td><td class="val-bold">${formatCZK(monthlyTotal)}</td><td class="val-bold">${formatCZK(monthlyClient)}</td></tr>
        <tr><td>Výnosnost</td><td>${(yieldPA * 100).toFixed(2)} % p.a.</td><td>${(pfYield * 100).toFixed(2)} % p.a.</td></tr>
        <tr><td><strong>Počáteční investice</strong></td><td class="val-bold">${formatCZK(buildingsVal)}</td><td class="val-bold">${formatCZK(pfInitialInvestment)}</td></tr>
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
        <tr><td><strong>Celkem k reinvestici</strong></td><td class="val-bold">${formatCZK(returnedAmount)}</td></tr>
    `;

    document.getElementById('pfInfoTable').innerHTML = `
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
        oldData.push(futureValue(buildingsVal, monthlyClient, yieldPA, y));
        newData.push(futureValue(pfInitialInvestment, monthlyClient, pfYield, y));
        investedData.push(pfInitialInvestment + monthlyClient * 12 * y);
    }

    destroyIfExists(buildingLineChart);
    buildingLineChart = createComparisonChart('buildingLineChart', labels, newData, oldData, investedData);
}

export function initBuildingComparison() {
    document.querySelectorAll('#building-savings-comparison input').forEach(el =>
        el.addEventListener('input', calculateBuildingSavingsComparison)
    );
    calculateBuildingSavingsComparison();
}
