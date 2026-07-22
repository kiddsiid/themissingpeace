import { DreamBackdrop } from '@/components/onboarding/DreamBackdrop';
import { CreateProfileForm } from '@/app/join/CreateProfileForm';

// Step 2 of the flow: "Create profile" (Supabase Auth sign-up).
export default function JoinPage() {
  return (
    <DreamBackdrop>
      <CreateProfileForm />
    </DreamBackdrop>
  );
}
