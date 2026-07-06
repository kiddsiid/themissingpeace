import type { Config } from 'tailwindcss';

// Brand: warm-neutral, manuscript tone. Tokens are CSS vars (see app/globals.css).
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pearl: 'var(--pearl)',
        cream: 'var(--cream)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        gold: 'var(--gold)',
        sage: 'var(--sage)',
        clay: 'var(--clay)',
        blush: 'var(--blush)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        voice: ['var(--font-voice)', 'ui-serif', 'Georgia', 'serif'],
      },
      borderRadius: { card: '12px', xl2: '16px' },
    },
  },
  plugins: [],
};
export default config;
