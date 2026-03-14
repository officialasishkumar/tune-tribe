import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, UserPlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard, GenreDistribution, SourceLoyalty, WeeklyActivity } from "@/components/AnalyticsCharts";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("alex");
  const [usernameSet, setUsernameSet] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [displayName, setDisplayName] = useState("Alex Rivera");
  const [bio, setBio] = useState("Electronic music enthusiast. Jazz on weekends.");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleSetUsername = () => {
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    setUsernameSet(true);
    setEditingUsername(false);
    toast.success("Username set! This cannot be changed.");
  };

  const handleAvatarUpload = () => {
    // Demo: simulate avatar change
    setAvatarUrl(`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}&backgroundColor=3b82f6`);
    toast.success("Profile picture updated");
  };

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated");
  };

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
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
              <Check className="w-3 h-3" /> Save
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Avatar + basic info */}
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
                <span className="text-2xl font-semibold text-muted-foreground">
                  {displayName.charAt(0)}
                </span>
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
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold tracking-tight">{displayName}</h2>
                <p className="text-xs text-muted-foreground">{bio}</p>
              </>
            )}

            {/* Username */}
            <div className="flex items-center gap-2">
              {!usernameSet || editingUsername ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">@</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="h-7 text-xs w-36 font-mono"
                    placeholder="username"
                  />
                  <Button size="sm" className="h-7 text-[10px] px-2" onClick={handleSetUsername}>
                    Set
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-mono text-primary">@{username}</span>
              )}
              {usernameSet && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  Permanent
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Personal stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <StatCard label="Tracks shared" value="34" change="+8%" />
          <StatCard label="Groups" value="5" />
          <StatCard label="Friends" value="12" />
          <StatCard label="Top genre" value="Electronic" />
        </motion.div>

        {/* Personal charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <GenreDistribution />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="p-4 rounded-xl bg-card shadow-card"
          >
            <SourceLoyalty />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-4 rounded-xl bg-card shadow-card md:col-span-2"
          >
            <WeeklyActivity />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
