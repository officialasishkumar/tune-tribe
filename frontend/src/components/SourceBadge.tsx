import { SpotifyIcon, AppleMusicIcon, YouTubeMusicIcon, GenericMusicIcon } from "./icons/MusicIcons";

type SourceBadgeProps = {
  url: string;
  size?: "sm" | "md";
};

const getSource = (url: string) => {
  if (url.includes("music.apple.com")) return { name: "Apple Music", icon: AppleMusicIcon, colorClass: "text-apple" };
  if (url.includes("spotify.com") || url.includes("open.spotify")) return { name: "Spotify", icon: SpotifyIcon, colorClass: "text-spotify" };
  if (url.includes("music.youtube")) return { name: "YouTube Music", icon: YouTubeMusicIcon, colorClass: "text-youtube" };
  if (url.includes("youtube.com") || url.includes("youtu.be")) return { name: "YouTube", icon: YouTubeMusicIcon, colorClass: "text-youtube" };
  return { name: "Link", icon: GenericMusicIcon, colorClass: "text-muted-foreground" };
};

export const SourceBadge = ({ url, size = "sm" }: SourceBadgeProps) => {
  const source = getSource(url);
  const Icon = source.icon;
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary">
      <Icon className={`${iconSize} ${source.colorClass}`} />
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {source.name}
      </span>
    </div>
  );
};

export { getSource };
