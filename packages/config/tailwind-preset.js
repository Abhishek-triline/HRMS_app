/**
 * Nexora HRMS — Tailwind preset.
 * Direct port of the THEME object in prototype/assets/theme.js.
 * The preset preserves the same class names (bg-forest, text-emerald, etc.)
 * so the prototype HTML translates 1:1 to React components.
 *
 * Re-exported from @nexora/config/tailwind-preset.
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        // Primary brand
        forest: '#1C3D2E', // primary CTAs, active nav, section anchors
        emerald: '#2D7A5F', // hover states, links, sub-headings
        mint: '#C8E6DA', // info boxes, table row hovers, soft fills
        softmint: '#E4F1EB', // table alternates, card highlights
        sage: '#C0CEC8', // borders, dividers, subtle separators

        // Text & surfaces
        charcoal: '#1A2420', // page titles, primary headings
        slate: '#4A5E57', // body text, metadata, secondary labels
        offwhite: '#F6F8F7', // page background

        // Status — semantic
        richgreen: '#1A7A4A', // approved / success
        greenbg: '#D4F0E0', // approved badge background
        crimson: '#C0392B', // error / destructive
        crimsonbg: '#FAE0DD', // error badge background
        umber: '#A05C1A', // pending / awaiting action
        umberbg: '#FAECD4', // pending badge background

        // Locked / Closed
        lockedbg: '#E4EBE8',
        lockedfg: '#1A2420',
      },
      fontFamily: {
        // next/font variables wired in apps/web/app/layout.tsx
        heading: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      keyframes: {
        // Hero scene animations — gated by prefers-reduced-motion at runtime
        'nx-blob1': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(28px,-22px) scale(1.08)' },
        },
        'nx-blob2': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-32px,18px) scale(1.10)' },
        },
        'nx-blob3': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(18px,28px) scale(0.95)' },
        },
        'nx-sun-pulse': {
          '0%, 100%': { opacity: '.5', transform: 'scale(1)' },
          '50%': { opacity: '.75', transform: 'scale(1.06)' },
        },
        shine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'nx-blob1': 'nx-blob1 14s ease-in-out infinite',
        'nx-blob2': 'nx-blob2 18s ease-in-out infinite',
        'nx-blob3': 'nx-blob3 16s ease-in-out infinite',
        'nx-sun-pulse': 'nx-sun-pulse 5s ease-in-out infinite',
        shine: 'shine 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

module.exports = preset;
