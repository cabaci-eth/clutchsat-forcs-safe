import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PasswordStrength, { isPasswordStrong } from "@/components/PasswordStrength";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast({ title: "Password too weak", description: "Please meet all password requirements.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: name },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link to verify your account." });
    }
  };

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a8a]">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">Start your SAT prep journey today</p>
          </div>
          <form className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card" onSubmit={handleSignup}>
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground" placeholder="Your name" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground" placeholder="••••••••" required />
              </div>
              <PasswordStrength password={password} className="mt-3" />
            </div>
            <Button className="w-full gradient-primary text-primary-foreground shadow-glow" disabled={loading || !isPasswordStrong(password)}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
