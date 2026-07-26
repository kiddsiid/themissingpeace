import type { Metadata } from 'next';
import { Manrope, Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

// One Engine redesign §17 typefaces. Exposed as CSS variables so both the legacy
// tokens (--font-voice) and the new design system (--font-ui) can resolve them.
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

// The landing surface sets body copy in Inter and uses Cormorant at 400 and in
// italic for the quiet asides, so both faces carry a wider range than the app
// chrome needs. See src/components/landing/home-landing.css.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Missing Peace',
  description:
    'Begin with the feeling. Turn the dream into the plan, and keep the plan aligned with what matters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${cormorant.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
