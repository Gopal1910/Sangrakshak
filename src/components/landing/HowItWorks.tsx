import { Code2, Brain, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Code2,
    title: "Add Script",
    desc: "Developers paste one lightweight script tag. Setup takes under 2 minutes.",
  },
  {
    icon: Brain,
    title: "AI Detects Behavior",
    desc: "Mouse movements, typing patterns, and traffic are analyzed by our AI in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Bots Blocked Instantly",
    desc: "Threats are stopped silently — no CAPTCHA, no friction for real users.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Three simple steps to protect your website from bots.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass rounded-xl p-8 text-center group hover:border-primary/30 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <div className="font-heading text-sm text-accent mb-2">Step {i + 1}</div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
