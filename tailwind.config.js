/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // บรรทัดนี้ต้องมี!
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-thai)', 'system-ui', 'sans-serif'],
      },
      // Design tokens: Glass Lavender (brand = #6355d8)
      colors: {
        brand: {
          50: '#f3f1fe',
          100: '#e8e5fc',
          200: '#d3cdf9',
          300: '#b4a9f3',
          400: '#8f7feb',
          500: '#6355d8',
          600: '#5443c4',
          700: '#4636a6',
          800: '#3a2e86',
          900: '#2f276b',
        },
        success: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        danger: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        ink: { DEFAULT: '#1e1b3a', muted: '#5b5876', subtle: '#6b6788' },
      },
      borderRadius: {
        card: '20px',
        control: '12px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(99, 85, 216, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-lg': '0 16px 48px rgba(99, 85, 216, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
      },
    },
  },
  plugins: [],
}
