import type {
  Analytics,
  AuthResponse,
  Friend,
  GroupSummary,
  Track,
  User,
} from "@/lib/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "tunetribe-auth-token";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

const toCamelCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toCamelCase);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(nestedValue);
      return acc;
    }, {});
  }

  return value;
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const setStoredToken = (token: string | null) => {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.detail === "string" ? payload.detail : "The request could not be completed.";
    throw new Error(message);
  }

  return toCamelCase(payload) as T;
}

export const api = {
  login: (input: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    }),
  register: (input: { email: string; password: string; username: string }) =>
    apiRequest<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    }),
  me: () => apiRequest<User>("/api/auth/me"),
  getProfile: () => apiRequest<User>("/api/profile"),
  updateProfile: (input: { displayName: string; bio: string; avatarUrl?: string | null }) =>
    apiRequest<User>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  listGroups: () => apiRequest<GroupSummary[]>("/api/groups"),
  createGroup: (input: { name: string; memberIds: number[] }) =>
    apiRequest<GroupSummary>("/api/groups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listGroupTracks: (groupId: number) => apiRequest<Track[]>(`/api/groups/${groupId}/tracks`),
  addTrack: (groupId: number, url: string) =>
    apiRequest<Track>(`/api/groups/${groupId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),
  getGroupAnalytics: (groupId: number, window: string) =>
    apiRequest<Analytics>(`/api/groups/${groupId}/analytics?window=${encodeURIComponent(window)}`),
  getPersonalAnalytics: (window: string) =>
    apiRequest<Analytics>(`/api/analytics/me?window=${encodeURIComponent(window)}`),
  searchUsers: (query: string) =>
    apiRequest<Friend[]>(`/api/friends?q=${encodeURIComponent(query)}`),
  addFriend: (friendId: number) =>
    apiRequest<Friend>(`/api/friends/${friendId}`, {
      method: "POST",
    }),
  removeFriend: (friendId: number) =>
    apiRequest<void>(`/api/friends/${friendId}`, {
      method: "DELETE",
    }),
};
