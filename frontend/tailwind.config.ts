import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          light: '#dcfce7',
        },
        dark: {
          DEFAULT: '#1f2937',
          light: '#374151',
        },
      },
    },
  },
  plugins: [],
};

export default config;
