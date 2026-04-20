// ====================== UTILITIES ======================

export function futureValue(initial, monthly, r, years) {
    let value = initial;
    for (let i = 1; i <= years * 12; i++) {
        value *= Math.pow(1 + r, 1 / 12);
        value += monthly;
    }
    return value;
}

export function formatCZK(val) {
    return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
    }).format(val);
}

export function calculateAnnualizedYield(totalContributed, finalValue, years) {
    if (years <= 0 || totalContributed <= 0) return 0;
    if (finalValue <= totalContributed) return 0;

    const monthlyContribution = totalContributed / (years * 12);
    let low = -0.5, high = 2.0, rate = 0.05;
    for (let i = 0; i < 50; i++) {
        const projected = futureValue(0, monthlyContribution, rate, years);
        if (Math.abs(projected - finalValue) < 100) break;
        if (projected < finalValue) low = rate; else high = rate;
        rate = (low + high) / 2;
    }
    return rate;
}

// Resolve fee rate based on target amount for PF, commodities, and crypto
export function resolvePFFeeRate(targetPF) {
    if (targetPF >= 5000000) return 0.02;
    if (targetPF >= 1000000) return 0.03;
    return 0.04;
}

export function resolveComFeeRate(comTotal) {
    if (comTotal >= 1000000) return 0.03;
    if (comTotal >= 700000)  return 0.04;
    return 0.05;
}

export function resolveCryptoFeeRate(cryptoTotal) {
    if (cryptoTotal >= 1000000) return 0.015;
    if (cryptoTotal >= 500000)  return 0.02;
    return 0.03;
}
