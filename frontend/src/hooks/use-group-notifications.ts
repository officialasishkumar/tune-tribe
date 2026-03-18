import { useEffect, useRef } from "react";
import type { Track } from "@/lib/types";

/**
 * Detects newly-added tracks in the active group and fires a browser
 * notification for each one.  On first mount (or when the active group
 * changes) the current track list is silently recorded so we never
 * spam the user with "old" tracks on page load.
 */
export function useGroupNotifications(
  tracks: Track[],
  groupName: string | null,
  activeGroupId: number | null,
) {
  const seenIds = useRef<Set<string | number>>(new Set());
  const initialized = useRef(false);
  const prevGroupId = useRef<number | null>(null);

  useEffect(() => {
    // Reset seen-set whenever the active group changes.
    if (prevGroupId.current !== activeGroupId) {
      seenIds.current = new Set();
      initialized.current = false;
      prevGroupId.current = activeGroupId;
    }

    if (!groupName) return;

    // On the first data-load for this group, silently mark all tracks as
    // seen so we only notify about tracks added *after* the page opened.
    if (!initialized.current) {
      tracks.forEach((t) => seenIds.current.add(t.id));
      initialized.current = true;
      return;
    }

    if (!tracks.length) return;

    const newTracks = tracks.filter((t) => !seenIds.current.has(t.id));
    if (newTracks.length === 0) return;

    // Always record them, even if we can't show a notification.
    newTracks.forEach((t) => seenIds.current.add(t.id));

    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    newTracks.forEach((track) => {
      const notification = new Notification(`🎵 New track in ${groupName}`, {
        body: `${track.title} · ${track.artist}\nShared by @${track.sharedBy}`,
        icon: "/favicon.ico",
        // Deduplicate: if the same track fires twice, only one bubble shows.
        tag: `tunetribe-track-${String(track.id)}`,
      });

      // Clicking the notification brings the app tab into focus.
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    });
  }, [tracks, groupName, activeGroupId]);
}
