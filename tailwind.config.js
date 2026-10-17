// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'cursive', 'sans-serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      colors: {
        bg: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          inset: 'var(--bg-inset)',
        },
        border: {
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          'primary-hover': 'var(--accent-primary-hover)',
          'on-primary': 'var(--accent-on-primary)',
          subtle: 'var(--accent-subtle)',
          'subtle-text': 'var(--accent-subtle-text)',
        },
        pink: {
          primary: 'var(--pink-primary)',
          subtle: 'var(--pink-subtle)',
        },
        status: {
          success: 'var(--status-success)',
          'success-subtle': 'var(--status-success-subtle)',
          warning: 'var(--status-warning)',
          'warning-subtle': 'var(--status-warning-subtle)',
          danger: 'var(--status-danger)',
          'danger-subtle': 'var(--status-danger-subtle)',
        },
        bubble: {
          bg: 'var(--bubble-bg)',
          text: 'var(--bubble-text)',
        },
      },
    },
  },
  plugins: [],
};