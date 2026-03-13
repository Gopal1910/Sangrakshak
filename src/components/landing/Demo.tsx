import { Play } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-dashboard.png";

export function Demo() {
  return (
    <section id="demo" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Watch <span className="text-gradient">Demo</span>
          </h2>
          <p className="text-muted-foreground">See real-time bot detection in action.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto relative rounded-xl overflow-hidden border border-border/50 glow-blue group cursor-pointer"
        >
          <img src={heroImg} alt="Demo preview" className="w-full" />
          <div className="absolute inset-0 bg-background/40 flex items-center justify-center group-hover:bg-background/30 transition-colors">
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center glow-blue group-hover:scale-110 transition-transform">
              <Play className="h-8 w-8 text-primary-foreground ml-1" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
