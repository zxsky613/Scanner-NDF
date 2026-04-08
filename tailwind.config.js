const nativewind = require('nativewind/preset');
const plugin = require('tailwindcss/plugin');

/** Même noms que ceux chargés par useFonts (@expo-google-fonts/poppins). */
const poppins = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [nativewind],
  theme: {
    extend: {
      fontFamily: {
        sans: [poppins.regular],
        poppins: [poppins.regular],
        'poppins-medium': [poppins.medium],
        'poppins-semibold': [poppins.semibold],
        'poppins-bold': [poppins.bold],
      },
      colors: {
        surface: '#F5F6FA',
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#7c8cff',
          500: '#4d6eff',
          600: '#2D5BFF',
          700: '#2547d1',
          800: '#1e38a8',
          900: '#1a2f85',
        },
        accent: {
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      borderRadius: {
        '4xl': '1.75rem',
        '5xl': '2rem',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.font-sans': { fontFamily: poppins.regular },
        '.font-normal': { fontFamily: poppins.regular, fontWeight: '400' },
        '.font-medium': { fontFamily: poppins.medium, fontWeight: '500' },
        '.font-semibold': { fontFamily: poppins.semibold, fontWeight: '600' },
        '.font-bold': { fontFamily: poppins.bold, fontWeight: '700' },
        '.font-extrabold': { fontFamily: poppins.bold, fontWeight: '800' },
        '.font-black': { fontFamily: poppins.bold, fontWeight: '900' },
      });
    }),
  ],
};
