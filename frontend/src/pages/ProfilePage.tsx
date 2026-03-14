import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, Mic, Music } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteArtist, setFavoriteArtist] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", "me", "30d"],
    queryFn: () => api.getPersonalAnalytics("30d"),
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setDisplayName(profileQuery.data.displayName);
    setBio(profileQuery.data.bio);
    setFavoriteGenre(profileQuery.data.favoriteGenre ?? "");
    setFavoriteArtist(profileQuery.data.favoriteArtist ?? "");
    setAvatarUrl(profileQuery.data.avatarUrl ?? "");
  }, [profileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: () => api.updateProfile({ 
      displayName, 
      bio, 
      favoriteGenre: favoriteGenre || null,
      favoriteArtist: favoriteArtist || null,
      avatarUrl: avatarUrl || null 
    }),
    onSuccess: (user) => {
      updateUser(user);
      queryClient.setQueryData(["profile"], user);
      toast.success("Profile updated");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Profile update failed.");
    },
  });

  const handleAvatarUpload = () => {
    setAvatarUrl(`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName || "TuneTribe")}`);
    toast.success("Profile picture updated");
  };

  const stats = analyticsQuery.data?.stats ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold tracking-tight">Profile</span>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
              <Check className="w-3 h-3" /> {saveProfileMutation.isPending ? "Saving" : "Save"}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="flex items-start gap-4"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden shadow-card">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">{displayName.charAt(0) || "T"}</span>
              )}
            </div>
            {isEditing && (
              <button
                onClick={handleAvatarUpload}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-elevated"
              >
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2">
            {isEditing ? (
              <>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-8 text-sm font-semibold"
                  placeholder="Display name"
                />
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Bio"
                />
                <div className="flex gap-2">
                  <Input
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Favorite Genre"
                  />
                  <Input
                    value={favoriteArtist}
                    onChange={(e) => setFavoriteArtist(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Favorite Artist"
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold tracking-tight">{profileQuery.data?.displayName}</h2>
                <p className="text-xs text-muted-foreground">{profileQuery.data?.bio || "No bio yet."}</p>
                <div className="flex gap-4 mt-2">
                  {profileQuery.data?.favoriteGenre && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Music className="w-3 h-3" /> {profileQuery.data.favoriteGenre}
                    </span>
                  )}
                  {profileQuery.data?.favoriteArtist && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mic className="w-3 h-3" /> {profileQuery.data.favoriteArtist}
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono text-primary">@{profileQuery.data?.username}</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Permanent</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change ?? undefined} />
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <GenreDistribution data={analyticsQuery.data?.genreDistribution ?? []} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <SourceLoyalty data={analyticsQuery.data?.sourceLoyalty ?? []} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-4 rounded-xl bg-card shadow-card md:col-span-2"
          >
            <WeeklyActivity data={analyticsQuery.data?.weeklyActivity ?? []} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
