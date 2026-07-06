# Running the app (plain-English)

## Restart the dev server
1. Find the window where it's running (it shows lines like "✓ Ready" / "Local: http://localhost:3000").
2. Click in that window and press **Ctrl + C** to stop it. (If it asks "Terminate batch job?", press **Y**.)
3. Start it again: type **npm run dev** and press Enter.

## Clear the cache (.next) — do this if styles look stale or you see weird errors
1. Stop the server first (Ctrl + C, as above).
2. Easiest: **double-click `restart-dev.bat`** in this folder. It clears the cache and starts the app for you.
   - Or do it by hand in the window: `rmdir /s /q .next` then `npm run dev`.
3. Open http://localhost:3000

`.next` is just a temporary build cache — deleting it is safe; Next.js rebuilds it.

## If port 3000 says it's in use
An old server is still running. Close that window (or restart your computer), then `npm run dev`.
