import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { getAuthErrorContent } from "@/lib/auth-errors";

describe("getAuthErrorContent", () => {
  it("returns actionable login guidance for invalid credentials", () => {
    const error = new ApiError("Invalid email, username, or password.", { status: 401 });

    expect(getAuthErrorContent(error, "login")).toEqual({
      title: "Your sign-in details didn't match",
      description:
        "Check your email or username and password, then try again. If you just created the account, sign in with the same username or email you registered.",
    });
  });

  it("returns actionable network guidance when the backend cannot be reached", () => {
    const error = new ApiError("Network down", { status: 0 });

    expect(getAuthErrorContent(error, "login")).toEqual({
      title: "TuneTribe is unreachable",
      description:
        "Check your internet connection or make sure the backend server is running, then try again.",
    });
  });

  it("maps validation issues to field-specific signup guidance", () => {
    const error = new ApiError("value is not a valid email address: An email address must have an @-sign.", {
      status: 422,
      issues: [{ path: ["body", "email"], message: "value is not a valid email address" }],
    });

    expect(getAuthErrorContent(error, "register")).toEqual({
      title: "Enter a valid email address",
      description: "Fix the email field, then try creating your account again.",
    });
  });
});
