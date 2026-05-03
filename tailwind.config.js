/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#070810',
        'surface-container': '#10121e',
        'surface-container-low': '#0c0e18',
        'surface-container-high': '#181b2e',
        'surface-container-highest': '#1e2133',
        primary: '#cfbcff',
        'primary-container': '#b599ff',
        'on-primary': '#39197c',
        'on-surface': '#e1e3e4',
        'on-surface-variant': '#948e9d',
        outline: '#948e9d',
        'outline-variant': '#494551',
        error: '#ffb4ab',
        'secondary-container': '#444654',
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        caveat: ['Caveat_400Regular'],
        'caveat-bold': ['Caveat_700Bold'],
        headline: ['NotoSerif_700Bold'],
        'headline-medium': ['NotoSerif_500Medium'],
        'headline-semibold': ['NotoSerif_600SemiBold'],
      },
      borderRadius: {
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
