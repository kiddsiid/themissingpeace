# Clerk webhook (so invited partners/planners sync automatically)

You only need this for **production**, OR if you want invited members to appear during local
dev. (The app now also self-heals membership on sign-in — see note at the bottom — so this is
optional locally.)

## Local dev (with a free tunnel)
1. Install ngrok once: https://ngrok.com/download (or `winget install ngrok`).
2. With the app running on port 3000, open a NEW terminal and run:
   `ngrok http 3000`
   It prints a public URL like `https://abc123.ngrok-free.app`.
3. In the **Clerk dashboard → Webhooks → Add Endpoint**:
   - Endpoint URL: `https://abc123.ngrok-free.app/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `organization.created`,
     `organization.updated`, `organizationMembership.created`, `organizationMembership.updated`
   - Create it, open it, copy the **Signing secret** (`whsec_…`).
4. Put that secret in `.env.local`: `CLERK_WEBHOOK_SECRET=whsec_…`
5. Restart the dev server.
   Note: the free ngrok URL changes each time you restart ngrok — update the Clerk endpoint URL
   when it does. (Cloudflare Tunnel `cloudflared` gives a stable URL if you prefer.)

## Production
Use your real domain: `https://yourapp.com/api/webhooks/clerk`, same events, set
`CLERK_WEBHOOK_SECRET` in your host's environment variables.

## Note: invites work locally without the webhook
On sign-in, the app reads the new member's active Clerk organization and creates their
`workspace_members` row on the spot (`src/lib/workspace/sync.ts`). So an invited partner/planner
who accepts and signs in will land in the workspace even if the webhook isn't set up. The webhook
is still the cleaner production path and also handles profile updates.
