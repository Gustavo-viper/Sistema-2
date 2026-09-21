/* Tema visual compartilhado */
(function () {
    'use strict';
    const THEMES = ['blue', 'white', 'green'];
    const saved = localStorage.getItem('ge-theme');
    const initial = THEMES.includes(saved) ? saved : 'blue';

    function applyTheme(theme) {
        const selected = THEMES.includes(theme) ? theme : 'blue';
        document.documentElement.dataset.theme = selected;
        localStorage.setItem('ge-theme', selected);
        document.querySelectorAll('[data-theme-choice]').forEach((button) => {
            const active = button.dataset.themeChoice === selected;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }

    function createPalette() {
        document.querySelectorAll('[data-theme-palette]').forEach((container) => {
            if (container.dataset.ready === 'true') return;
            container.dataset.ready = 'true';
            container.innerHTML = `
                <span class="theme-label">Cores:</span>
                <button type="button" class="theme-dot theme-dot-blue" data-theme-choice="blue" aria-label="Tema azul" title="Azul"><span>Azul</span></button>
                <button type="button" class="theme-dot theme-dot-white" data-theme-choice="white" aria-label="Tema branco" title="Branco"><span>Branco</span></button>
                <button type="button" class="theme-dot theme-dot-green" data-theme-choice="green" aria-label="Tema verde" title="Verde"><span>Verde</span></button>`;
            container.addEventListener('click', (event) => {
                const button = event.target.closest('[data-theme-choice]');
                if (button) applyTheme(button.dataset.themeChoice);
            });
        });
        applyTheme(document.documentElement.dataset.theme || initial);
    }

    document.documentElement.dataset.theme = initial;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createPalette);
    else createPalette();
    window.applyGETheme = applyTheme;
})();
