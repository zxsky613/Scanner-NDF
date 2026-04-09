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
        surface: '#F2F6F8',
        primary: {
          50: '#eff6f9',
          100: '#dceef4',
          200: '#b8dce8',
          300: '#8cc4d6',
          400: '#7ab3c5',
          500: '#6eaebf',
          600: '#609FB5',
          700: '#5089a0',
          800: '#447184',
          900: '#3a5f6e',
        },
        ink: {
          DEFAULT: '#242949',
          50: '#eef0f5',
          100: '#d9dde9',
          200: '#b3bbce',
          300: '#8692b0',
          400: '#5c6a8c',
          500: '#424e74',
          600: '#343f5e',
          700: '#2d3550',
          800: '#242949',
          900: '#1a1e32',
        },
        accent: {
          500: '#6eaebf',
          600: '#609FB5',
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
