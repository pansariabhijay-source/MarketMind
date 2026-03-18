/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        void:    '#0F1117',
        base:    '#141720',
        surface: '#1A1D27',
        card:    '#1E2130',
        border:  '#272B3A',
        line:    '#313548',
        gold:    '#E8B86D',
        'gold-dim': '#9A7340',
        teal:    '#4ECDC4',
        'teal-dim': '#1A4A47',
        rose:    '#F87171',
        muted:   '#6B7280',
        soft:    '#9CA3B0',
        bright:  '#CDD5E0',
        white:   '#E8EDF5',
      },
      animation: {
        'fade-up':   'fadeUp 0.6s ease forwards',
        'fade-in':   'fadeIn 0.4s ease forwards',
        'blink':     'blink 1.2s step-end infinite',
        'float':     'float 6s ease-in-out infinite',
        'pulse-soft':'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:     { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        blink:      { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSoft:  { '0%,100%': { opacity: 0.6 }, '50%': { opacity: 1 } },
      }
    }
  },
  plugins: []
}
