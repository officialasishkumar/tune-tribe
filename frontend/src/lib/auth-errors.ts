import { ApiError } from "@/lib/api";

type AuthMode = "login" | "register";

export type AuthErrorContent = {
  title: string;
  description: string;
};

const hasIssue = (error: ApiError, fieldName: string) =>
  error.issues.some((issue) => issue.path.includes(fieldName));

export const getAuthErrorContent = (error: unknown, mode: AuthMode): AuthErrorContent => {
  const defaultTitle = mode === "login" ? "We couldn't sign you in" : "We couldn't create your account";
  const defaultDescription =
    mode === "login"
      ? "Review your details and try again. If the problem continues, reload the page and retry."
      : "Review the highlighted details, then try creating your account again.";

  if (!(error instanceof ApiError)) {
    return {
      title: defaultTitle,
      description: defaultDescription,
    };
  }

  if (error.status === 0) {
    return {
      title: "TuneTribe is unreachable",
      description: "Check your internet connection or make sure the backend server is running, then try again.",
    };
  }

  if (mode === "login") {
    if (error.status === 401) {
      return {
        title: "Your sign-in details didn't match",
        description: "Check your email or username and password, then try again. If you just created the account, sign in with the same username or email you registered.",
      };
    }

    if (error.status === 422) {
      if (hasIssue(error, "identifier")) {
        return {
          title: "Enter your email or username",
          description: "Add the email or username for your account, then try signing in again.",
        };
      }

      if (hasIssue(error, "password")) {
        return {
          title: "Enter your password",
          description: "Your password is missing or too short. Enter the full password for your account, then try again.",
        };
      }
    }
  }

  if (mode === "register") {
    if (error.status === 409 && /email/i.test(error.message)) {
      return {
        title: "That email is already in use",
        description: "Sign in with that email instead, or use a different email address to create a new account.",
      };
    }

    if (error.status === 409 && /username/i.test(error.message)) {
      return {
        title: "That username is already taken",
        description: "Choose a different username with letters, numbers, or underscores, then try again.",
      };
    }

    if (error.status === 422) {
      if (hasIssue(error, "email")) {
        return {
          title: "Enter a valid email address",
          description: "Fix the email field, then try creating your account again.",
        };
      }

      if (hasIssue(error, "username")) {
        return {
          title: "Pick a valid username",
          description: "Use at least 3 characters and only letters, numbers, or underscores, then try again.",
        };
      }

      if (hasIssue(error, "display_name")) {
        return {
          title: "Add your name",
          description: "Enter the name you want shown in TuneTribe, then submit the form again.",
        };
      }

      if (hasIssue(error, "password")) {
        return {
          title: "Use a stronger password",
          description: "Your password must be at least 8 characters long. Update it and try again.",
        };
      }
    }
  }

  if (error.status >= 500) {
    return {
      title: "TuneTribe hit a server problem",
      description: "Wait a moment and try again. If it keeps happening, restart the backend or check the server logs.",
    };
  }

  return {
    title: defaultTitle,
    description: error.message || defaultDescription,
  };
};
