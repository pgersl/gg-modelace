// ====================== MAIN ENTRY POINT ======================
import { applyChartDefaults }      from './config.js';
import { initCalculator }          from './calculator.js';
import { initPayout }              from './payout.js';
import { initSolution }            from './solution.js';
import { initPensionComparison }   from './pension.js';
import { initBuildingComparison }  from './building.js';
import { initMortgageComparison }  from './mortgage.js';
import { initClientCare }          from './care.js';

// --- Chart global defaults ---
applyChartDefaults();

// --- Navigation ---
const navButtons   = document.querySelectorAll('.nav-button');
const mainGrids    = document.querySelectorAll('.main-grid');
const sectionTitles= document.querySelectorAll('.title h1');

navButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        mainGrids.forEach(grid  => grid.classList.remove('selected'));
        mainGrids[index].classList.add('selected');

        sectionTitles.forEach(title => title.style.display = 'none');
        sectionTitles[index].style.display = 'block';

        navButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
    });
});

// --- Initialise all sections ---
initCalculator();
initPayout();
initSolution();
initPensionComparison();
initBuildingComparison();
initMortgageComparison();
initClientCare();
