import { redirect } from 'next/navigation';

// The sign-up journey now begins with "Tell us about you" (/welcome) before the
// Create-profile step (/join). Keep the old path working by forwarding into it.
export default function Page() {
  redirect('/welcome');
}
