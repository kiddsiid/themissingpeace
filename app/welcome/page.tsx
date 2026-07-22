import { DreamBackdrop } from '@/components/onboarding/DreamBackdrop';
import { WelcomeForm } from '@/app/welcome/WelcomeForm';

// Step 1 of the flow: "Tell us about you" (before creating the profile).
export default function WelcomePage() {
  return (
    <DreamBackdrop>
      <WelcomeForm />
    </DreamBackdrop>
  );
}
