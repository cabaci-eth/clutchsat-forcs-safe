import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/60 bg-card/50 backdrop-blur-sm">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e3a8a]">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">ClutchSAT</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            ClutchSAT helps you ace the SAT with personalized practice, smart flashcards, and tailored study plans.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Practice</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/practice" className="hover:text-primary transition-colors">Questions</Link></li>
            <li><Link to="/flashcards" className="hover:text-primary transition-colors">Flashcards</Link></li>
            <li><Link to="/quiz" className="hover:text-primary transition-colors">Quiz Mode</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Tools</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/progress" className="hover:text-primary transition-colors">Progress</Link></li>
            <li><Link to="/plan" className="hover:text-primary transition-colors">Study Plan</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ClutchSAT. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
