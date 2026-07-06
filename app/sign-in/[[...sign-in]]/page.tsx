import { SignIn } from '@clerk/nextjs';
// Returning couples go straight to their Peace Center.
export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--cream)]">
      <SignIn forceRedirectUrl="/peace-center" signUpUrl="/sign-up" />
    </main>
  );
}
