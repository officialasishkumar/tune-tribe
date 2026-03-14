import { Camera, Mic, Music, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export type ProfileData = {
  displayName: string;
  username?: string;
  bio: string;
  favoriteGenre: string;
  favoriteArtist: string;
  avatarUrl: string;
};

type ProfileInfoProps = {
  data: ProfileData;
  isEditing: boolean;
  onDataChange: (field: keyof ProfileData, value: string) => void;
  onAvatarClick: () => void;
};

export const ProfileInfo = ({ data, isEditing, onDataChange, onAvatarClick }: ProfileInfoProps) => {
  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row items-center md:items-start gap-8"
      >
        <div className="relative group">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary flex items-center justify-center overflow-hidden shadow-elevated border-4 border-background ring-1 ring-border/50">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-16 h-16 text-muted-foreground opacity-50" />
            )}
          </div>
          <button
            onClick={onAvatarClick}
            className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg text-primary-foreground hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Change profile picture"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          {isEditing ? (
            <div className="space-y-4 max-w-md mx-auto md:mx-0">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Display Name</label>
                <Input
                  value={data.displayName}
                  onChange={(e) => onDataChange("displayName", e.target.value)}
                  className="h-12 text-lg font-semibold bg-card"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bio</label>
                <Input
                  value={data.bio}
                  onChange={(e) => onDataChange("bio", e.target.value)}
                  className="h-10 text-base bg-card"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Genre</label>
                  <Input
                    value={data.favoriteGenre}
                    onChange={(e) => onDataChange("favoriteGenre", e.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="e.g. Indie Pop"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Artist</label>
                  <Input
                    value={data.favoriteArtist}
                    onChange={(e) => onDataChange("favoriteArtist", e.target.value)}
                    className="h-10 text-base bg-card"
                    placeholder="e.g. The Weeknd"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{data.displayName}</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                  <span className="text-base font-mono font-medium text-primary">@{data.username}</span>
                </div>
              </div>
              
              <p className="text-lg text-muted-foreground max-w-xl mx-auto md:mx-0 leading-relaxed">
                {data.bio || "This user hasn't written a bio yet, but their music taste speaks for itself."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                {data.favoriteGenre && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-medium">
                    <Music className="w-4 h-4 text-primary" /> 
                    {data.favoriteGenre}
                  </div>
                )}
                {data.favoriteArtist && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground text-sm font-medium">
                    <Mic className="w-4 h-4 text-primary" /> 
                    {data.favoriteArtist}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};