'use client';

import { LiveblocksProvider, RoomProvider, useOthers } from '@liveblocks/react';

function PresenceCount() {
  const others = useOthers();
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]" aria-live="polite">
      <span className="h-2 w-2 rounded-full bg-[var(--sage)]" aria-hidden />
      {others.length ? `${others.length} collaborator${others.length === 1 ? '' : 's'} here` : 'Just you here'}
    </span>
  );
}

export function ObjectPresence({
  objectType,
  objectId,
  enabled,
}: {
  objectType: 'decision' | 'feast' | 'feast-scene' | 'feast-dish';
  objectId: string;
  enabled: boolean;
}) {
  if (!enabled) return <span className="text-[11px] text-[var(--ink-faint)]">Presence unavailable</span>;
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={`${objectType}:${objectId}`} initialPresence={{}}>
        <PresenceCount />
      </RoomProvider>
    </LiveblocksProvider>
  );
}
