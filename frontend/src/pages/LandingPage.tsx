import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, Users, BarChart3, Radio, ArrowRight, Play, Headphones, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LandingPage() {
  const { isAuthenticated, token } = useAuth();
  
  // Use token existence as a quick proxy to prevent flashing "Sign In" before user data loads
  const isLoggedIn = isAuthenticated || Boolean(token);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">TuneTribe</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#community" className="hover:text-foreground transition-colors">Community</a>
            <a href="#analytics" className="hover:text-foreground transition-colors">Analytics</a>
          </nav>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
          <div className="container mx-auto text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Your Music. Your Tribe. <br className="hidden md:block" />
                <span className="text-primary">Perfectly In Sync.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Connect with friends, share your favorite tracks, and discover new music together. TuneTribe is the ultimate social platform for music lovers.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                  <Button size="lg" className="h-14 px-8 text-lg rounded-full gap-2">
                    {isLoggedIn ? "Go to Dashboard" : "Join the Tribe"} <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="#features">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full">
                    See How It Works
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Hero Image / Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-16 relative mx-auto max-w-5xl rounded-xl border bg-card shadow-2xl overflow-hidden"
            >
              <div className="aspect-video bg-muted relative flex items-center justify-center">
                 <img src="/placeholder.svg" alt="App Preview" className="w-full h-full object-cover opacity-80 mix-blend-luminosity" />
                 <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-center justify-center">
                    <div className="p-4 bg-background/50 backdrop-blur rounded-full shadow-lg">
                      <Play className="w-12 h-12 text-primary ml-1" />
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to connect</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built for audiophiles and social butterflies alike. TuneTribe brings your listening habits to life.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Share2 className="w-6 h-6 text-primary" />,
                  title: "Share Instantly",
                  description: "Drop a track from Spotify, Apple Music, or YouTube directly into your feed."
                },
                {
                  icon: <Users className="w-6 h-6 text-primary" />,
                  title: "Build Your Tribe",
                  description: "Create groups, add friends, and curate shared playlists that everyone can contribute to."
                },
                {
                  icon: <BarChart3 className="w-6 h-6 text-primary" />,
                  title: "Deep Analytics",
                  description: "Dive into your listening stats, see your top tracks, and compare with your friends."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof / Aesthetic Image Section */}
        <section className="py-24 px-4 overflow-hidden">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Music is better when shared</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Stop keeping those hidden gems to yourself. Discover what your friends are actually listening to, beyond the algorithms. TuneTribe brings the human touch back to music discovery.
                </p>
                <ul className="space-y-4">
                  {[
                    "Real-time friend activity feeds",
                    "Seamless cross-platform integration",
                    "Beautiful, responsive design for all devices"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="bg-primary/20 p-1 rounded-full">
                        <Headphones className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                   <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                      <Button size="lg" className="rounded-full px-8">
                        {isLoggedIn ? "Go to Dashboard" : "Start Exploring"}
                      </Button>
                   </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl rounded-full" />
                <div className="relative grid grid-cols-2 gap-4">
                  <div className="space-y-4 mt-8">
                    <img src="/placeholder.svg" alt="UI Element 1" className="rounded-2xl shadow-lg border w-full h-48 object-cover" />
                    <img src="/placeholder.svg" alt="UI Element 2" className="rounded-2xl shadow-lg border w-full h-64 object-cover" />
                  </div>
                  <div className="space-y-4">
                    <img src="/placeholder.svg" alt="UI Element 3" className="rounded-2xl shadow-lg border w-full h-64 object-cover" />
                    <img src="/placeholder.svg" alt="UI Element 4" className="rounded-2xl shadow-lg border w-full h-48 object-cover" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary"></div>
          <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-10 mix-blend-overlay object-cover"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">Ready to tune in?</h2>
              <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
                Join thousands of music enthusiasts who have already found their tribe. Free to sign up.
              </p>
              <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg rounded-full shadow-xl hover:scale-105 transition-transform">
                  {isLoggedIn ? "Go to Dashboard" : "Create Your Account"}
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-12 border-t">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-primary" />
              <span className="text-lg font-bold">TuneTribe</span>
            </div>
            <p className="text-muted-foreground max-w-xs">
              The social network built for music discovery, sharing, and analytics.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#analytics" className="hover:text-foreground">Analytics</a></li>
              <li><Link to={isLoggedIn ? "/dashboard" : "/auth"} className="hover:text-foreground">{isLoggedIn ? "Dashboard" : "Sign In"}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TuneTribe. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
