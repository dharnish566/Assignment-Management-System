/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)' },
        ink: 'var(--color-text)',
        canvas: 'var(--color-canvas)',
        muted: 'var(--color-muted)',
        border: 'var(--color-border)',
        sidebar: 'var(--color-sidebar)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)' },
    },
  },
  plugins: [],
};
