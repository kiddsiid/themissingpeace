// Public guest-surface layout — no app chrome, just the couple's world.
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--cream)] via-[var(--pearl)] to-[var(--cream)]">
      <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
      <footer className="pb-8 text-center text-[10px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
        Made with The Missing Peace
      </footer>
    </div>
  );
}
