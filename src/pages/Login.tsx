import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a magic link to sign in." });
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
            <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your ClutchSAT account</p>
          </div>

          <div className="mb-4 flex rounded-xl border border-border bg-muted p-1">
            <button onClick={() => setMode("password")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Password</button>
            <button onClick={() => setMode("magic")} className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === "magic" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Magic Link</button>
          </div>

          <form className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card" onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground" placeholder="you@example.com" required />
              </div>
            </div>
            {mode === "password" && (
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground" placeholder="••••••••" required />
                </div>
              </div>
            )}
            <Button className="w-full gradient-primary text-primary-foreground shadow-glow" disabled={loading}>
              {loading ? "Please wait..." : mode === "password" ? "Sign In" : "Send Magic Link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
