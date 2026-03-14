import { ApiError } from "@/lib/api";

type AuthMode = "login" | "register";

export type AuthErrorContent = {
  title: string;
  description: string;
};

const hasIssue = (error: ApiError, fieldName: string) =>
  error.issues.some((issue) => issue.path.includes(fieldName));

export const getAuthErrorContent = (error: unknown, mode: AuthMode): AuthErrorContent => {
  const defaultTitle = mode === "login" ? "Sign-in failed" : "Sign-up failed";
  const defaultDescription = "Try again.";

  if (!(error instanceof ApiError)) {
    return { title: defaultTitle, description: defaultDescription };
  }

  if (error.status === 0) {
    return { title: "Can't reach TuneTribe", description: "Check connection or backend." };
  }

  if (mode === "login") {
    if (error.status === 401) {
      return { title: "Wrong email or password", description: "" };
    }
    if (error.status === 422 && hasIssue(error, "identifier")) {
      return { title: "Enter email or username", description: "" };
    }
  }

  if (mode === "register") {
    if (error.status === 409 && /email/i.test(error.message)) {
      return { title: "Email already in use", description: "" };
    }
    if (error.status === 409 && /username/i.test(error.message)) {
      return { title: "Username taken", description: "" };
    }
    if (error.status === 422) {
      if (hasIssue(error, "email")) return { title: "Invalid email", description: "" };
      if (hasIssue(error, "username")) return { title: "Invalid username", description: "" };
      if (hasIssue(error, "display_name")) return { title: "Enter your name", description: "" };
    }
  }

  if (error.status >= 500) {
    return { title: "Server error", description: "Try again later." };
  }

  return { title: defaultTitle, description: error.message || defaultDescription };
};
