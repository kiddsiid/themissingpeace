// The Clerk webhook has been retired (the app moved to Supabase Auth). This stub keeps
// the endpoint responding with 410 Gone so any stale Clerk webhook configuration fails
// loudly and visibly instead of 404-ing silently. Safe to delete once Clerk is fully
// deprovisioned.
export async function POST() {
  return new Response('Clerk webhooks are retired; identity is handled by Supabase Auth.', {
    status: 410,
  });
}
