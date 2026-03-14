import React, { Suspense, Component, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Stars, Sparkles, OrbitControls, ContactShadows } from "@react-three/drei";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Disc3 } from "lucide-react";
import { useAuth } from "@/lib/auth";

class WebGLErrorBoundary extends Component<{children: ReactNode, fallback: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode, fallback: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL Error caught by boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function FloatingShapes() {
  return (
    <>
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <mesh position={[2, 1, -2]} scale={1.5}>
          <torusKnotGeometry args={[1, 0.3, 128, 16]} />
          <meshStandardMaterial color="#8b5cf6" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={2} floatIntensity={1.5}>
        <mesh position={[-3, -1, -3]} scale={1.2}>
          <octahedronGeometry args={[1]} />
          <meshStandardMaterial color="#ec4899" roughness={0.2} metalness={0.6} />
        </mesh>
      </Float>
      
      <Float speed={3} rotationIntensity={1} floatIntensity={2}>
         <mesh position={[0, -2.5, -1]} scale={0.8}>
           <icosahedronGeometry args={[1, 0]} />
           <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.7} />
         </mesh>
      </Float>
    </>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#ec4899" />
      <FloatingShapes />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.5} color="#8b5cf6" />
      <ContactShadows position={[0, -4, 0]} opacity={0.4} scale={20} blur={2} far={4} color="#000000" />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </>
  );
}

export default function LandingPage3D() {
  const { isAuthenticated, token } = useAuth();
  const isLoggedIn = isAuthenticated || Boolean(token);

  return (
    <div className="relative min-h-screen bg-slate-950 text-foreground overflow-hidden">
      {/* 3D Canvas Background or Fallback */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <WebGLErrorBoundary 
          fallback={<div className="w-full h-full flex items-center justify-center opacity-20"><Disc3 className="w-32 h-32 text-primary animate-pulse" /></div>}
        >
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      {/* Navbar overlay */}
      <header className="absolute top-0 w-full z-50 bg-slate-950/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-lg backdrop-blur">
              <Disc3 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TuneTribe</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button className="bg-primary/80 hover:bg-primary text-white border-none backdrop-blur">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90 text-white border-none shadow-lg shadow-primary/20">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Overlay */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pointer-events-none">
        <div className="container mx-auto text-center max-w-4xl pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="p-8 md:p-12 rounded-3xl bg-slate-900/30 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md">
               <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
               <span className="text-sm font-medium text-white">The next dimension of music</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white leading-tight">
              Visualize Your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-500">Sonic Universe</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Step into a space where your listening habits take shape. Connect with your tribe, explore shared frequencies, and curate the ultimate social playlist.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" className="h-14 px-8 text-lg rounded-full gap-2 bg-white text-black hover:bg-slate-200 transition-transform hover:scale-105">
                  {isLoggedIn ? "Enter Dashboard" : "Start Exploring"} <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Subtle overlay gradient at the bottom */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none" />
    </div>
  );
}
