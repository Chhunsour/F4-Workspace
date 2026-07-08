/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Kept in sync with the CSS variables in style.css.
        // --font-ui / --font-display / --font-brand are the source of truth;
        // these stacks match, so Tailwind's font-sans/font-display/font-brand
        // utilities resolve the same fonts even without the variable.
        sans: [
          '"Google Sans"',
          '"Google Sans Flex"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"Cal Sans"',
          '"Google Sans"',
          '"Google Sans Flex"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        brand: [
          'Futura',
          '"Futura PT"',
          '"Century Gothic"',
          '"Avenir Next"',
          '"Trebuchet MS"',
          'ui-sans-serif',
          'sans-serif',
        ],
      },
      colors: {
        // Primary brand — periwinkle indigo built around #5B7BD4 (= brand-600,
        // the primary-button / link base). 500 is a hair lighter for rings and
        // dark-mode text; 700 is the darker hover/pressed tone.
        brand: {
          50:  '#f0f3fb',
          100: '#dfe6f7',
          200: '#c6d2f0',
          300: '#a8bae7',
          400: '#8ba3e0',
          500: '#6f8bd9',
          600: '#5b7bd4',
          700: '#4a63b4',
          800: '#3e5496',
          900: '#34467c',
          950: '#212a49',
        },
        // Accent = warm sunflower yellow. Used sparingly for highlights,
        // countdowns, memory throwbacks.
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
        // Semantic supporting palette — used for status, categories, reactions.
        // Kept muted to sit inside the brand-forward system without going rainbow.
        grass: {   // fresh green — completed, streaks, success
          50:  '#ecfdf5',
          100: '#d1fae5',
          300: '#6ee7b7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        tangerine: { // soft orange — due soon, warning
          50:  '#fff7ed',
          100: '#ffedd5',
          300: '#fdba74',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        blush: { // pink — social, reactions
          50:  '#fdf2f8',
          100: '#fce7f3',
          300: '#f9a8d4',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
        },
        iris: { // purple — subject categories, memory
          50:  '#f5f3ff',
          100: '#ede9fe',
          300: '#c4b5fd',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        surface: {
          light:  '#f6f6f6',
          card:   '#ffffff',
          border: '#e6e7ea',
          muted:  '#8a8f98',
        },
        // Neutral ink + dark surfaces. Kept grey, not blue, so dark mode
        // never drifts into navy/charcoal-blue.
        night: {
          50:  '#f5f6f8',
          100: '#e4e6ea',
          200: '#c5c8d0',
          300: '#a8adb8',
          400: '#8f95a3',
          500: '#747b89',
          600: '#555b67',
          700: '#3a3d45',
          800: '#26282d',
          900: '#202125',
          950: '#18191c',
        },
      },
      boxShadow: {
        // Border-first cards: shadows stay whisper-soft, lift only on hover.
        soft:   '0 1px 2px rgba(15,20,40,0.05)',
        card:   '0 1px 2px rgba(15,20,40,0.04), 0 2px 6px rgba(15,20,40,0.04)',
        cardH:  '0 4px 10px rgba(15,20,40,0.06), 0 10px 24px rgba(15,20,40,0.07)',
        pop:    '0 12px 40px rgba(15,20,40,0.16)',
        // Brand-tinted lifts for primary CTAs and hero surfaces.
        brand:   '0 10px 30px -12px rgba(91,123,212,0.55)',
        brandLg: '0 20px 50px -18px rgba(91,123,212,0.55)',
        // Liquid-glass elevations kept for navigation chrome only.
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
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
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
        // Slow brand glow for hero surfaces + focus mode.
        brandGlow: {
          '0%, 100%': { opacity: '0.55' },
          '50%':      { opacity: '0.85' },
        },
        springIn: {
          '0%':   { transform: 'scale(0.85)', opacity: '0' },
          '55%':  { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        pop:       'pop 240ms cubic-bezier(0.22,1,0.36,1)',
        checkmark: 'checkmark 260ms ease-out forwards',
        slideUp:   'slideUp 220ms cubic-bezier(0.22,1,0.36,1)',
        fadeIn:    'fadeIn 160ms ease-out',
        livePulse: 'livePulse 2s ease-in-out infinite',
        brandGlow: 'brandGlow 5s ease-in-out infinite',
        springIn:  'springIn 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
