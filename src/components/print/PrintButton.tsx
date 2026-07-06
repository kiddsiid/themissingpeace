'use client';
// One-click print for the printables pipeline. Hidden on paper via the print stylesheet.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      data-no-print
      className="fixed bottom-6 right-6 z-50 rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm text-white shadow-lg transition-transform hover:-translate-y-0.5"
    >
      🖨 Print
    </button>
  );
}
