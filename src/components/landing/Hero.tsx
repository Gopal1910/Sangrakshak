import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-dashboard.png";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
              AI-Powered Bot Protection
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Invisible AI Bot Protection{" "}
              <span className="text-gradient">Without CAPTCHA</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Sangrakshak AI uses advanced behavioral analysis to detect and block bots in real-time — no CAPTCHAs, no friction, no compromised user experience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup">
                 <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-blue font-semibold px-8">
                   Sign Up
                 </Button>
              </Link>
              <a href="#demo">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary">
                  Watch Demo
                </Button>
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative rounded-xl overflow-hidden border border-border/50 glow-blue">
              <img src={heroImg} alt="Sangrakshak AI Dashboard" className="w-full rounded-xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
