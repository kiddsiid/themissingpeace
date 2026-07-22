import { DreamBackdrop } from '@/components/onboarding/DreamBackdrop';
import { SignInForm } from '@/app/sign-in/[[...sign-in]]/SignInForm';

// Returning couples sign back into their Peace Center (Supabase Auth).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return (
    <DreamBackdrop>
      <SignInForm redirectTo={redirect} />
    </DreamBackdrop>
  );
}
