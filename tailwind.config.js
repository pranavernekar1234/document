/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['TT Norms Pro', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Core fintech palette — see MASTER UI REDESIGN PROMPT
        canvas: '#F5F5F5',   // app background
        ink:    '#2B2644',   // dark accent card (used sparingly, for contrast sections)
        // Category accent colors — used only as subtle icon tints / soft chip
        // backgrounds, never as large saturated surfaces, to keep the
        // 30-tool grid scannable while staying within the minimal palette.
        brand:  { 50: '#EFF6FF', 100: '#DBEAFE', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
        violet: { 50: '#F5F3FF', 100: '#EDE9FE', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
        cyan:   { 50: '#ECFEFF', 100: '#CFFAFE', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2' },
        emerald:{ 50: '#ECFDF5', 100: '#D1FAE5', 400: '#34D399', 500: '#22C55E', 600: '#16A34A' },
        rose:   { 50: '#FFF1F2', 100: '#FFE4E6', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48' },
        amber:  { 50: '#FFFBEB', 100: '#FEF3C7', 400: '#FBB740', 500: '#F59E0B', 600: '#D97706' },
        pink:   { 50: '#FDF2F8', 100: '#FCE7F3', 400: '#F472B6', 500: '#EC4899', 600: '#DB2777' },
      },
      borderRadius: {
        '4xl': '32px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        // Faint hairline grid for hero/section texture — black strokes at
        // very low opacity, legible-but-quiet on the light canvas.
        'grid-light': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40' fill='none' stroke='rgb(0 0 0 / 0.045)'%3e%3cpath d='M0 .5H39.5V40'/%3e%3c/svg%3e\")",
      },
      boxShadow: {
        // Soft shadows only — no neon/glow. Matches "Stripe/Linear/Mercury"
        // quality bar: barely-there elevation, not drama.
        'soft':    '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)',
        'soft-md': '0 2px 8px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
        'soft-lg': '0 12px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'soft-xl': '0 24px 64px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)',
        'ink-lg':  '0 24px 64px rgba(43,38,68,0.35), 0 4px 16px rgba(43,38,68,0.2)',
      },
      animation: {
        'float':         'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow':    'float 9s ease-in-out infinite',
        'shimmer':       'shimmer 2.5s linear infinite',
        'spin-slow':     'spin 8s linear infinite',
        'fade-up':       'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':      'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right':   'slideRight 0.5s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        float:       { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-14px)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeUp:      { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:     { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        slideRight:  { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
