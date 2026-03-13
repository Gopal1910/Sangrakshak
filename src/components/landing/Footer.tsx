import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-bold tracking-wider">
              Sangrakshak<span className="text-primary">AI</span>
            </span>
          </Link>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="mailto:hello@sangrakshak.ai" className="hover:text-foreground transition-colors">hello@sangrakshak.ai</a>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Sangrakshak AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
