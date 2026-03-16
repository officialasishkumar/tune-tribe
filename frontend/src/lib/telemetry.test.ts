import { describe, expect, it } from "vitest";

import { __private__ } from "@/lib/telemetry";

describe("telemetry helpers", () => {
  it("redacts emails and long numbers from captured text", () => {
    expect(__private__.sanitizeText("user@example.com order 123456")).toBe(
      "[redacted-email] order [redacted-number]"
    );
  });

  it("supports prefix skip-path patterns", () => {
    expect(__private__.matchesPathPattern("/auth/reset", "/auth*")).toBe(true);
    expect(__private__.matchesPathPattern("/dashboard", "/auth*")).toBe(false);
  });

  it("builds a stable selector from telemetry attributes", () => {
    document.body.innerHTML = `
      <div>
        <button data-telemetry-name="open-analytics">Analytics</button>
      </div>
    `;

    const button = document.querySelector("button");
    expect(button).not.toBeNull();
    expect(__private__.buildSelector(button!)).toContain('button[data-telemetry-name="open-analytics"]');
  });
});
