import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, ArrowRight, Mail, Lock, User, Music, Mic } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getAuthErrorContent } from "@/lib/auth-errors";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [favoriteArtist, setFavoriteArtist] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setSession } = useAuth();

  const statsQuery = useQuery({
    queryKey: ["public", "stats"],
    queryFn: api.getGlobalStats,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
  const stats = statsQuery.data ?? null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Disc3 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = isLogin
        ? await api.login({ identifier, password })
        : await api.register({ 
            email, 
            password, 
            username, 
            displayName,
            favoriteGenre: favoriteGenre || undefined, 
            favoriteArtist: favoriteArtist || undefined 
          });

      setSession(response.accessToken, response.user);
      toast.success(isLogin ? "Welcome back!" : "Account created");
      navigate("/dashboard");
    } catch (error) {
      const content = getAuthErrorContent(error, isLogin ? "login" : "register");
      toast.error(content.title, content.description ? { description: content.description } : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className="w-8 h-8 text-primary-foreground" />
          <span className="text-2xl font-semibold tracking-tight text-primary-foreground">TuneTribe</span>
        </div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="text-5xl font-bold tracking-tight text-primary-foreground leading-tight"
          >
            The shared ledger of your
            <br />
            group's sonic history.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="mt-6 text-lg text-primary-foreground/70 max-w-lg"
          >
            Share music URLs from any platform. Track what your tribe listens to.
            Analyze genres, sources, and trends — all in one place.
          </motion.p>
        </div>
        <div className="flex items-center gap-8">
          {[
            { label: "Groups created", value: stats ? stats.groupsCreated.toLocaleString() : "..." },
            { label: "Tracks shared", value: stats ? stats.tracksShared.toLocaleString() : "..." },
            { label: "Active members", value: stats ? stats.activeMembers.toLocaleString() : "..." },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="text-2xl font-mono tabular-nums font-semibold text-primary-foreground">{stat.value}</span>
              <span className="block text-sm text-primary-foreground/60 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Disc3 className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight">TuneTribe</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-base text-muted-foreground mt-2">
            {isLogin ? "Sign in with your email or username." : "Join the shared ledger."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-11 h-12 text-base"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 h-12 text-base"
                    required
                  />
                </div>
                <div className="relative">
                  <Music className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Favorite Genre (Optional)"
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
                <div className="relative">
                  <Mic className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Favorite Artist (Optional)"
                    value={favoriteArtist}
                    onChange={(e) => setFavoriteArtist(e.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
              </>
            )}
            {isLogin ? (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Email or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 h-12 text-base"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gap-2 mt-2" disabled={isSubmitting}>
              {isSubmitting ? "Please wait" : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
