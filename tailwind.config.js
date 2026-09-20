/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: { ink: '#130e10', panel: '#1d1518', wine: '#6f1d2a', ember: '#a5363f', gold: '#d8ad57', parchment: '#f1e8d5', mist: '#bfb3b0' },
      fontFamily: { display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'], sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 0 0 1px rgba(216,173,87,.25), 0 24px 80px rgba(0,0,0,.35)', card: '0 18px 55px rgba(0,0,0,.25)' }
    }
  },
  plugins: []
};
