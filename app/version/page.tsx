import type { Metadata } from 'next';

import { buildInfo } from '@/lib/build/info';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Build · The Missing Peace',
  description: 'Which commit this deployment was built from.',
  robots: { index: false, follow: false },
};

// The readable half of the build stamp (One-Engine §26.3). Deliberately plain,
// deliberately outside the app shell, deliberately reachable without a login:
// this page is how a deploy gets confirmed at the URL rather than in a build log.
export default function VersionPage() {
  const build = buildInfo();
  const rows: Array<[string, string]> = [
    ['Commit', build.known ? build.sha : 'unknown — this build could not identify its commit'],
    ['Short', build.shortSha],
    ['Branch', build.branch],
    ['Built', build.builtAt],
  ];

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#12100E',
        color: '#EDE7DE',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '34rem', width: '100%' }}>
        <p
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.55,
            margin: '0 0 0.75rem',
          }}
        >
          The Missing Peace
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontWeight: 400,
            fontSize: '2rem',
            margin: '0 0 1.5rem',
          }}
        >
          This deployment
        </h1>
        <dl style={{ margin: 0, display: 'grid', gap: '0.9rem' }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'grid', gap: '0.25rem' }}>
              <dt style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.5 }}>
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all',
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', lineHeight: 1.6, opacity: 0.55 }}>
          Compare the short commit against <code>git log</code>. If it does not match the commit the
          phase closed on, the deploy did not land — regardless of what the build log said.
        </p>
      </div>
    </main>
  );
}
