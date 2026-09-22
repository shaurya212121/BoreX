/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1A120B',
        panel:   '#241A10',
        rust:    '#C1622B',
        slate:   '#5C7A89',
        danger:  '#D64545',
        success: '#6B8F71',
        hairline:'#3A2A1C',
        parchment: '#EDE0D0',
      },
      fontFamily: {
        grotesk: ['"Space Grotesk"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
