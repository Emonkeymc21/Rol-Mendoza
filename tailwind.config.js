/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        panel: 'rgb(var(--panel-rgb) / <alpha-value>)',
        wine: 'rgb(var(--wine-rgb) / <alpha-value>)',
        ember: 'rgb(var(--ember-rgb) / <alpha-value>)',
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        parchment: 'rgb(var(--parchment-rgb) / <alpha-value>)',
        mist: 'rgb(var(--mist-rgb) / <alpha-value>)'
      },
      fontFamily: { display: ['Cinzel', 'Georgia', 'Cambria', 'Times New Roman', 'serif'], body: ['Alegreya', 'Georgia', 'serif'], sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 0 0 1px rgba(216,173,87,.25), 0 24px 80px rgba(0,0,0,.35)', card: '0 18px 55px rgba(0,0,0,.25)' }
    }
  },
  plugins: []
};
