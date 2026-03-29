import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Track } from "@/lib/types";

import { useGroupNotifications } from "./use-group-notifications";

const notificationSpy = vi.fn();

class MockNotification {
  static permission: NotificationPermission = "granted";

  onclick: (() => void) | null = null;

  close = vi.fn();

  constructor(title: string, options?: NotificationOptions) {
    notificationSpy({ title, options });
  }
}

function HookHarness({
  activeGroupId,
  groupName,
  tracks,
}: {
  activeGroupId: number | null;
  groupName: string | null;
  tracks: Track[];
}) {
  useGroupNotifications(tracks, groupName, activeGroupId);
  return null;
}

describe("useGroupNotifications", () => {
  afterEach(() => {
    notificationSpy.mockReset();
    vi.unstubAllGlobals();
  });

  it("notifies when the first track arrives after an initially empty group", () => {
    vi.stubGlobal("Notification", MockNotification);

    const { rerender } = render(
      <HookHarness activeGroupId={1} groupName="Synth Squad" tracks={[]} />
    );

    expect(notificationSpy).not.toHaveBeenCalled();

    rerender(
      <HookHarness
        activeGroupId={1}
        groupName="Synth Squad"
        tracks={[
          {
            id: 42,
            title: "Midnight Echo",
            artist: "Nova Pulse",
            genre: "Synthwave",
            url: "https://example.com/track",
            source: "spotify",
            sharedBy: "alice",
            sharedAt: "2026-03-17T19:00:00Z",
          },
        ]}
      />
    );

    expect(notificationSpy).toHaveBeenCalledTimes(1);
    expect(notificationSpy).toHaveBeenCalledWith({
      title: "🎵 New track in Synth Squad",
      options: expect.objectContaining({
        body: "Midnight Echo · Nova Pulse\nShared by @alice",
        tag: "tunetribe-track-42",
      }),
    });
  });
});
