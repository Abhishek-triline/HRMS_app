import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [require('@nexora/config/tailwind-preset')],
  content: ['./src/**/*.{ts,tsx}'],
  plugins: [],
};

export default config;
