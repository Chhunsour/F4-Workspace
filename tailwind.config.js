/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Google Sans"',
          '"Google Sans Flex"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dae6ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#5c8dff',
          500: '#3a68ff',
          600: '#2549f0',
          700: '#1c39cc',
          800: '#1a319e',
          900: '#1b2f7e',
        },
        accent: {
          50:  '#fffaea',
          100: '#fff1c4',
          200: '#ffe08a',
          300: '#ffca47',
          400: '#ffb61f',
          500: '#f59a06',
          600: '#d97706',
          700: '#b3560a',
          800: '#8f4310',
          900: '#763913',
        },
        surface: {
          light:  '#f6f6f6',
          card:   '#ffffff',
          border: '#e6e7ea',
          muted:  '#8a8f98',
        },
        night: {
          50:  '#eef0f5',
          100: '#d5d9e3',
          200: '#a6adbf',
          300: '#7a83a0',
          400: '#565f7e',
          500: '#3d4665',
          600: '#2c334d',
          700: '#1f2540',
          800: '#161b33',
          900: '#0f1428',
          950: '#0a0e1e',
        },
      },
      boxShadow: {
        // Border-first cards: shadows stay whisper-soft, lift only on hover.
        soft:   '0 1px 2px rgba(15,20,40,0.05)',
        card:   '0 1px 2px rgba(15,20,40,0.04), 0 2px 6px rgba(15,20,40,0.04)',
        cardH:  '0 4px 10px rgba(15,20,40,0.06), 0 10px 24px rgba(15,20,40,0.07)',
        pop:    '0 12px 40px rgba(15,20,40,0.16)',
        // Liquid-glass elevations: soft ambient drop + faint top inner highlight.
        glass:   '0 8px 32px -10px rgba(17,24,39,0.20), inset 0 1px 0 0 rgba(255,255,255,0.55)',
        glassSm: '0 4px 18px -8px rgba(17,24,39,0.16), inset 0 1px 0 0 rgba(255,255,255,0.45)',
        glassDk: '0 10px 34px -8px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.07)',
        rail:    '0 16px 50px -14px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0.96)', opacity: '0' },
          '60%':  { transform: 'scale(1.02)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        checkmark: {
          '0%':   { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
      },
      animation: {
        pop:       'pop 240ms cubic-bezier(0.22,1,0.36,1)',
        checkmark: 'checkmark 260ms ease-out forwards',
        slideUp:   'slideUp 220ms cubic-bezier(0.22,1,0.36,1)',
        fadeIn:    'fadeIn 160ms ease-out',
        livePulse: 'livePulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
