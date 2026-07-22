import type { Metadata } from 'next';
import { Manrope, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

// One Engine redesign §17 typefaces. Exposed as CSS variables so both the legacy
// tokens (--font-voice) and the new design system (--font-ui) can resolve them.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Missing Peace',
  description: 'A Wedding Planning Engine — turn the dream into the plan, and keep the plan aligned with what matters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
