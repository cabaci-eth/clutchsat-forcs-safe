import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, GraduationCap as LogoIcon, LogOut, User, ChevronDown, Crown, GraduationCap, BarChart3, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import NavbarXP from "@/components/NavbarXP";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const learnLinks = [
  { to: "/practice", label: "Question Bank" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/quiz", label: "Quiz" },
  { to: "/mock-tests", label: "Mock Tests" },
];

const progressLinks = [
  { to: "/progress", label: "Progress" },
  { to: "/plan", label: "Study Plan" },
];

const communityLinks = [
  { to: "/forum", label: "Forum" },
  { to: "/community", label: "Community Bank" },
];

const toolLinks = [
  { to: "/score-calculator", label: "SAT Score Calculator" },
  { to: "/tools/orbital-mechanics", label: "Orbital Mechanics" },
  { to: "/tools/n-body-simulator", label: "N-Body Simulator" },
  { to: "/tools/cellular-automata", label: "Cellular Automata" },
];

interface NavDropdownProps {
  label: string;
  icon: React.ReactNode;
  links: { to: string; label: string }[];
  pathname: string;
  matchPaths: string[];
}

const NavDropdown = ({ label, icon, links, pathname, matchPaths }: NavDropdownProps) => {
  const isActive = matchPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`group flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}>
          {icon}
          {label}
          <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200" sideOffset={8}>
        {links.map((link) => (
          <DropdownMenuItem key={link.to} asChild>
            <Link to={link.to} className={`cursor-pointer transition-colors duration-150 ${pathname === link.to ? "text-primary font-medium" : ""}`}>
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface MobileAccordionProps {
  label: string;
  icon: React.ReactNode;
  links: { to: string; label: string }[];
  pathname: string;
  onNavigate: () => void;
}

const MobileAccordion = ({ label, icon, links, pathname, onNavigate }: MobileAccordionProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
        <span className="flex items-center gap-2">{icon}{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="ml-5 flex flex-col gap-0.5 border-l border-border pl-3 py-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                pathname === link.to
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["navbar_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const displayName = profile?.username || user?.email || "User";
  const emailInitial = (user?.email || "U")[0].toUpperCase();
  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a8a] shadow-sm transition-shadow duration-200 group-hover:shadow-md">
            <LogoIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">ClutchSAT</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          <Link
            to="/dashboard"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              location.pathname === "/dashboard"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Dashboard
          </Link>

          <NavDropdown
            label="Learn"
            icon={<GraduationCap className="h-4 w-4" />}
            links={learnLinks}
            pathname={location.pathname}
            matchPaths={["/practice", "/flashcards", "/quiz"]}
          />

          <NavDropdown
            label="Progress & Plans"
            icon={<BarChart3 className="h-4 w-4" />}
            links={progressLinks}
            pathname={location.pathname}
            matchPaths={["/progress", "/plan"]}
          />

          <NavDropdown
            label="Community"
            icon={<Users className="h-4 w-4" />}
            links={communityLinks}
            pathname={location.pathname}
            matchPaths={["/forum", "/community"]}
          />

          <NavDropdown
            label="Tools"
            icon={<Wrench className="h-4 w-4" />}
            links={toolLinks}
            pathname={location.pathname}
            matchPaths={["/score-calculator", "/tools"]}
          />

          <Link
            to="/pricing"
            className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
              location.pathname === "/pricing"
                ? "bg-primary/10 text-primary"
                : "text-primary hover:bg-primary/5"
            }`}
          >
            <Crown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
            Premium
            <span className="absolute inset-0 rounded-lg ring-0 ring-primary/0 transition-all duration-300 group-hover:ring-1 group-hover:ring-primary/20" />
          </Link>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <>
              <NavbarXP />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-all duration-200">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xs font-bold text-primary">{emailInitial}</span>
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200" sideOffset={8}>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="transition-all duration-200" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow transition-all duration-200 hover:shadow-lg" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileOpen ? "close" : "open"}
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.15 }}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
              onClick={closeMobile}
            />
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 z-50 border-t border-border/60 bg-card shadow-lg lg:hidden"
            >
              <div className="flex flex-col gap-0.5 p-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
                <Link
                  to="/dashboard"
                  onClick={closeMobile}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    location.pathname === "/dashboard"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Dashboard
                </Link>

                <MobileAccordion
                  label="Learn"
                  icon={<GraduationCap className="h-4 w-4" />}
                  links={learnLinks}
                  pathname={location.pathname}
                  onNavigate={closeMobile}
                />

                <MobileAccordion
                  label="Progress & Plans"
                  icon={<BarChart3 className="h-4 w-4" />}
                  links={progressLinks}
                  pathname={location.pathname}
                  onNavigate={closeMobile}
                />

                <MobileAccordion
                  label="Community"
                  icon={<Users className="h-4 w-4" />}
                  links={communityLinks}
                  pathname={location.pathname}
                  onNavigate={closeMobile}
                />

                <MobileAccordion
                  label="Tools"
                  icon={<Wrench className="h-4 w-4" />}
                  links={toolLinks}
                  pathname={location.pathname}
                  onNavigate={closeMobile}
                />

                <Link
                  to="/pricing"
                  onClick={closeMobile}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    location.pathname === "/pricing"
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:bg-primary/5"
                  }`}
                >
                  <Crown className="h-4 w-4" /> Premium
                </Link>

                <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={closeMobile}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                      >
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => { signOut(); closeMobile(); }}>
                        <LogOut className="mr-1 h-4 w-4" /> Log out
                      </Button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" asChild>
                        <Link to="/login" onClick={closeMobile}>Log in</Link>
                      </Button>
                      <Button size="sm" className="flex-1 gradient-primary text-primary-foreground" asChild>
                        <Link to="/signup" onClick={closeMobile}>Sign up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
