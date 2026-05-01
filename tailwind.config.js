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
        background: '#0a122b',
        'surface-container': '#171e38',
        'surface-container-low': '#131a34',
        'surface-container-high': '#212943',
        'surface-container-highest': '#2c344f',
        primary: '#cfbcff',
        'primary-container': '#b599ff',
        'on-primary': '#39197c',
        'on-surface': '#dce1ff',
        'on-surface-variant': '#cbc4d3',
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
      },
      borderRadius: {
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
