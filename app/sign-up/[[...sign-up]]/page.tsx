import { SignUp } from '@clerk/nextjs';
// New couples land in the storybook opening after signing up.
export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--cream)]">
      <SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
    </main>
  );
}
