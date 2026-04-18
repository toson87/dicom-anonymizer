/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        sidebar: '#0d1117',
        panel: '#161b22',
        surface: '#1c2128',
        border: '#30363d',
        accent: '#1f6feb',
        'accent-hover': '#388bfd',
        'phi-identity': '#da3633',
        'phi-date': '#d29922',
        'phi-uid': '#bc8cff',
        'phi-institution': '#f0883e',
        'phi-safe': '#238636',
      },
    },
  },
  plugins: [],
}
