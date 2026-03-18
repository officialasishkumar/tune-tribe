export type User = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  favoriteGenre?: string | null;
  favoriteArtist?: string | null;
  avatarUrl?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: User;
};

export type Friend = {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isFriend: boolean;
  friendshipStatus: "none" | "pending_outgoing" | "pending_incoming" | "accepted";
};

export type FriendLookupResponse = {
  user: Friend | null;
};

export type FriendRequest = {
  id: number;
  fromUser: Friend;
  createdAt: string;
};

export type GroupSummary = {
  id: number;
  name: string;
  memberCount: number;
  trackCount: number;
  lastActiveAt?: string | null;
  members: string[];
  memberDetails?: { id: number; username: string }[];
  isOwner?: boolean;
};

export type Track = {
  id: number | string;
  title: string;
  artist: string;
  album?: string | null;
  genre: string;
  url: string;
  source: string;
  sharedBy: string;
  albumArtUrl?: string | null;
  durationMs?: number | null;
  sharedAt: string;
};

export type StatPoint = {
  label: string;
  value: string;
  change?: string | null;
};

export type DistributionPoint = {
  name: string;
  value: number;
};

export type SourcePoint = {
  name: string;
  tracks: number;
};

export type DailyPoint = {
  day: string;
  tracks: number;
};

export type MonthlyPoint = {
  month: string;
  tracks: number;
};

export type MemberLeaderboardEntry = {
  name: string;
  tracks: number;
  topGenre: string;
};

export type TopTrackEntry = {
  title: string;
  artist: string;
  shares: number;
  genre: string;
};

export type GlobalStatsResponse = {
  groupsCreated: number;
  tracksShared: number;
  activeMembers: number;
};

export type Analytics = {
  stats: StatPoint[];
  genreDistribution: DistributionPoint[];
  sourceLoyalty: SourcePoint[];
  weeklyActivity: DailyPoint[];
  monthlyTrend: MonthlyPoint[];
  memberLeaderboard: MemberLeaderboardEntry[];
  topTracks: TopTrackEntry[];
};
