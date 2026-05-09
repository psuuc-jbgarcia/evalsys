/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        dark: '#0F172A',
        surface: '#FFFFFF',
        muted: '#CBD5E1',
        text: '#0F172A',
        bg: '#F8FAFC',
      },
    },
  },
  plugins: [],
};
