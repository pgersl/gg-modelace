// ====================== CHART FACTORIES ======================
import { formatCZK } from './utils.js';

const LINE_DEFAULTS = {
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { ticks: { callback: value => formatCZK(value) } } }
};

/**
 * Single-series growth line chart (investment calculator).
 * Returns the new Chart instance.
 */
export function createGrowthChart(canvasId, labels, valueData, investedData, profit) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const isPositive = profit >= 0;

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Hodnota investice',
                    data: valueData,
                    borderColor:     isPositive ? '#6d9f88' : '#b84b4b',
                    backgroundColor: isPositive ? '#6d9f8830' : '#b84b4b6b',
                    tension: 0.1,
                    borderWidth: 1,
                    fill: 1
                },
                {
                    label: 'Celkem investováno',
                    data: investedData,
                    borderColor: '#45403a',
                    tension: 0,
                    borderWidth: 1,
                    fill: false
                }
            ]
        },
        options: { ...LINE_DEFAULTS }
    });
}

/**
 * Two-strategy comparison line chart (pension, building savings).
 */
export function createComparisonChart(canvasId, labels, newData, oldData, investedData) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Nové řešení',      data: newData,      borderColor: '#6d9f88', backgroundColor: '#6d9f883f', tension: 0.1, borderWidth: 1, fill: 1 },
                { label: 'Aktuální řešení',  data: oldData,      borderColor: '#cc331d', backgroundColor: '#cc331d5f', tension: 0.1, borderWidth: 1, fill: 2 },
                { label: 'Celková investice', data: investedData, borderColor: '#45403a', backgroundColor: '#45403a61', tension: 0,   borderWidth: 1, fill: false }
            ]
        },
        options: { ...LINE_DEFAULTS }
    });
}

/**
 * Multi-asset portfolio line chart (complete solution).
 */
export function createPortfolioLineChart(canvasId, labels, valueData, investedData) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Celková hodnota',       data: valueData,    borderColor: '#6d9f88', backgroundColor: '#6d9f883f', fill: 1,     tension: 0.1, borderWidth: 1 },
                { label: 'Investované prostředky', data: investedData, borderColor: '#45403a', backgroundColor: '#45403a61', fill: false, tension: 0.1, borderWidth: 1 }
            ]
        },
        options: { ...LINE_DEFAULTS }
    });
}

/**
 * Doughnut chart for portfolio allocation.
 */
export function createDoughnutChart(canvasId, labels, data, colors) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

/**
 * Bar chart for per-asset yield (client care).
 */
export function createYieldBarChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Zhodnocení (%)',
                data,
                backgroundColor: data.map(v => v >= 0 ? '#6d9f88' : '#cc331d')
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { minRotation: 0, maxRotation: 0, font: { size: 11 } } },
                y: {
                    ticks: { callback: value => value + ' %' },
                    grid: {
                        color: ctx => ctx.tick.value === 0 ? '#000000' : '#e0e0e0',
                        lineWidth: ctx => ctx.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });
}

export function destroyIfExists(chartRef) {
    if (chartRef) chartRef.destroy();
}
