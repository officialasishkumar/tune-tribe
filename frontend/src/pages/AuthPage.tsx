import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, ArrowRight, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, setSession } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = isLogin
        ? await api.login({ email, password })
        : await api.register({ email, password, username });

      setSession(response.accessToken, response.user);
      toast.success(isLogin ? "Welcome back!" : "Account created");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className="w-6 h-6 text-primary-foreground" />
          <span className="text-lg font-semibold tracking-tight text-primary-foreground">TuneTribe</span>
        </div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="text-3xl font-semibold tracking-tight text-primary-foreground leading-tight"
          >
            The shared ledger of your
            <br />
            group's sonic history.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="mt-4 text-sm text-primary-foreground/60 max-w-md"
          >
            Share music URLs from any platform. Track what your tribe listens to.
            Analyze genres, sources, and trends — all in one place.
          </motion.p>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: "Groups created", value: "2,847" },
            { label: "Tracks shared", value: "184K" },
            { label: "Active members", value: "12.4K" },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="text-lg font-mono tabular-nums font-semibold text-primary-foreground">{stat.value}</span>
              <span className="block text-[11px] text-primary-foreground/40 mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Disc3 className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">TuneTribe</span>
          </div>

          <h2 className="text-xl font-semibold tracking-tight">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Sign in to your tribe." : "Join the shared ledger."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-10 text-sm"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-10 text-sm"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-10 text-sm"
                required
              />
            </div>
            <Button type="submit" className="w-full h-10 text-sm gap-2" disabled={isSubmitting}>
              {isSubmitting ? "Please wait" : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
