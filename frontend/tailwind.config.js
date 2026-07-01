/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Ink / surface stack (near-black institutional dark)
        void:    '#08090D',
        base:    '#0C0E13',
        surface: '#12141B',
        card:    '#151822',
        raised:  '#1B1F2B',
        border:  '#242938',
        line:    '#323848',

        // Signature accents
        gold:    '#E8B86D',
        'gold-dim': '#8C6A3C',
        teal:    '#4ECDC4',
        'teal-dim': '#215551',

        // Semantic
        positive: '#3FB950',   // GO
        warning:  '#E3A008',   // CONDITIONAL
        negative: '#F0616D',   // NO-GO / risk
        rose:     '#F0616D',

        // Text ramp
        muted:   '#636B7E',
        soft:    '#9098AB',
        bright:  '#C6CEDE',
        white:   '#EAEFF7',
      },
      boxShadow: {
        glow:      '0 0 0 1px rgba(232,184,109,0.14), 0 8px 40px rgba(0,0,0,0.5)',
        'glow-teal': '0 0 0 1px rgba(78,205,196,0.16), 0 8px 40px rgba(0,0,0,0.5)',
        panel:     '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 48px -12px rgba(0,0,0,0.7)',
      },
      animation: {
        'fade-up':   'fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in':   'fadeIn 0.5s ease forwards',
        'blink':     'blink 1.2s step-end infinite',
        'float':     'float 6s ease-in-out infinite',
        'pulse-soft':'pulseSoft 3s ease-in-out infinite',
        'sweep':     'sweep 2.2s ease-in-out infinite',
        'count':     'fadeIn 0.8s ease forwards',
      },
      keyframes: {
        fadeUp:     { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:     { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        blink:      { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseSoft:  { '0%,100%': { opacity: 0.55 }, '50%': { opacity: 1 } },
        sweep:      { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
}
