// ====================== CONFIG & DEFAULTS ======================
import { formatCZK } from './utils.js';

export const ASSET_BASE = {
    pf:         { yield: 0.0790, feeRate: 0, spread: 0,     name: 'Permanentní fond' },
    gold_14oz:  { yield: 0.1132, feeRate: 0, spread: 0.076, name: 'Zlato' },
    gold_1oz:   { yield: 0.1132, feeRate: 0, spread: 0.076, name: 'Zlato' },
    gold_50g:   { yield: 0.1132, feeRate: 0, spread: 0.078, name: 'Zlato' },
    silver_1kg: { yield: 0.1320, feeRate: 0, spread: 0.336, name: 'Stříbro' },
    silver_10oz:{ yield: 0.1320, feeRate: 0, spread: 0.433, name: 'Stříbro' },
    btc:        { yield: 0.1890, feeRate: 0, spread: 0.1150, name: 'Bitcoin' },
    eth:        { yield: 0.1350, feeRate: 0, spread: 0.1150, name: 'Ethereum' }
};

export function applyChartDefaults() {
    Chart.defaults.font.family = "'Raleway', sans-serif";
    Chart.defaults.color = '#45403a';
}
