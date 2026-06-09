import { useState, useEffect, useCallback, useRef } from "react";
import { User, Camera, Trash2, Loader2, Check, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import PasswordStrength, { isPasswordStrong } from "@/components/PasswordStrength";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const BIO_MAX = 500;
const COOLDOWN_DAYS = 7;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const PasswordChangeSection = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [verifiedCurrent, setVerifiedCurrent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSave =
    verifiedCurrent &&
    isPasswordStrong(newPw) &&
    newPw === confirmPw &&
    newPw.length > 0 &&
    newPw !== currentPw;

  const handleVerifyCurrent = async () => {
    if (!currentPw.trim()) {
      toast({ title: "Enter your current password", variant: "destructive" });
      return;
    }

    setVerifying(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setVerifying(false);
      toast({ title: "Session expired. Please log in again.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });

    setVerifying(false);

    if (error) {
      setVerifiedCurrent(false);
      setNewPw("");
      setConfirmPw("");
      toast({ title: "Current password is incorrect", description: "Please try again.", variant: "destructive" });
      return;
    }

    setVerifiedCurrent(true);
    toast({ title: "Current password verified" });
  };

  const handleChange = async () => {
    if (!canSave) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);

    if (error) {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated successfully" });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setVerifiedCurrent(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const onCurrentChange = (value: string) => {
    setCurrentPw(value);
    if (verifiedCurrent) {
      setVerifiedCurrent(false);
      setNewPw("");
      setConfirmPw("");
    }
  };

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="h-4 w-4" /> Change Password
      </h3>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPw}
              onChange={(e) => onCurrentChange(e.target.value)}
              placeholder="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant={verifiedCurrent ? "secondary" : "outline"}
            disabled={verifying || !currentPw}
            onClick={handleVerifyCurrent}
            className="sm:w-28"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : verifiedCurrent ? "Verified" : "Verify"}
          </Button>
        </div>

        {!verifiedCurrent && (
          <p className="text-xs text-muted-foreground">Verify your current password before setting a new one.</p>
        )}

        {verifiedCurrent && (
          <>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <PasswordStrength password={newPw} />

            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {confirmPw && newPw !== confirmPw && <p className="text-xs text-destructive">Passwords do not match.</p>}
            {newPw && newPw === currentPw && <p className="text-xs text-destructive">New password must be different.</p>}

            <Button onClick={handleChange} disabled={!canSave || saving} size="sm">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Update Password
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [savingUsername, setSavingUsername] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio((profile as any).bio || "");
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  // Debounced username uniqueness check
  useEffect(() => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();
      setUsernameAvailable(!data || data.user_id === user?.id);
      setCheckingUsername(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [username, profile?.username, user?.id]);

  const cooldownEnd = profile?.last_username_change
    ? new Date(new Date(profile.last_username_change).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const inCooldown = cooldownEnd && cooldownEnd > new Date() && profile?.username !== null;
  const daysLeft = cooldownEnd ? Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const canSaveUsername =
    username !== (profile?.username || "") &&
    USERNAME_REGEX.test(username) &&
    usernameAvailable === true &&
    !inCooldown;

  const handleSaveUsername = async () => {
    if (!canSaveUsername || !user) return;
    setSavingUsername(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("user_id", user.id);
    setSavingUsername(false);
    if (error) {
      const msg = error.message.includes("once every 7 days")
        ? "Username change cooldown active. Try again later."
        : error.message.includes("profiles_username_unique")
        ? "That username is already taken."
        : "Failed to update username.";
      toast({ title: msg, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Username updated!" });
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;
    setSavingBio(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bio: bio.slice(0, BIO_MAX) } as any)
      .eq("user_id", user.id);
    setSavingBio(false);
    if (error) {
      toast({ title: "Failed to update bio.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Bio updated!" });
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type. Use JPEG, PNG, GIF, or WebP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast({ title: "File too large. Maximum 2MB.", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setSavingAvatar(true);

    // Delete old avatars in user folder
    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(existing.map((f) => `${user.id}/${f.name}`));
    }

    const ext = avatarFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true });

    if (uploadErr) {
      setSavingAvatar(false);
      toast({ title: "Upload failed.", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("user_id", user.id);

    setSavingAvatar(false);
    setAvatarFile(null);
    if (updateErr) {
      toast({ title: "Failed to save avatar.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Avatar updated!" });
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setRemovingAvatar(true);

    const { data: existing } = await supabase.storage
      .from("avatars")
      .list(user.id);
    if (existing && existing.length > 0) {
      await supabase.storage
        .from("avatars")
        .remove(existing.map((f) => `${user.id}/${f.name}`));
    }

    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);

    setRemovingAvatar(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast({ title: "Avatar removed." });
  };

  if (!user) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const emailInitial = (user.email || "U")[0].toUpperCase();

  return (
    <Layout>
      <div className="container mx-auto max-w-xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground mb-8">Manage your account settings.</p>

          {!profile?.username && (
            <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Set your username</p>
                <p className="text-xs text-muted-foreground">Choose a username to display in forums and leaderboards.</p>
              </div>
            </div>
          )}

          <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="h-24 w-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-border">
                    <span className="font-display text-3xl font-bold text-primary">{emailInitial}</span>
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <p className="text-sm text-muted-foreground">Max 2MB · JPEG, PNG, GIF, WebP</p>
                <div className="flex gap-2">
                  {avatarFile && (
                    <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleUploadAvatar} disabled={savingAvatar}>
                      {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      Save Avatar
                    </Button>
                  )}
                  {avatarPreview && !avatarFile && (
                    <Button size="sm" variant="outline" onClick={handleRemoveAvatar} disabled={removingAvatar}>
                      {removingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-sm font-medium text-foreground">Username</label>
              {inCooldown && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  You can change your username again in {daysLeft} day{daysLeft !== 1 ? "s" : ""}.
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="letters, numbers, underscores (3-20)"
                    maxLength={20}
                    disabled={!!inCooldown}
                  />
                  {checkingUsername && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingUsername && usernameAvailable === true && username !== (profile?.username || "") && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                <Button
                  onClick={handleSaveUsername}
                  disabled={!canSaveUsername || savingUsername}
                >
                  {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
              {username && !USERNAME_REGEX.test(username) && (
                <p className="text-xs text-destructive mt-1">3-20 characters: letters, numbers, underscores only.</p>
              )}
              {usernameAvailable === false && (
                <p className="text-xs text-destructive mt-1">Username already taken.</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-foreground">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell us about yourself..."
                rows={3}
                className="mt-2"
                maxLength={BIO_MAX}
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{bio.length}/{BIO_MAX}</span>
                <Button
                  size="sm"
                  onClick={handleSaveBio}
                  disabled={savingBio || bio === ((profile as any)?.bio || "")}
                >
                  {savingBio ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Bio"}
                </Button>
              </div>
            </div>

            {/* Account Info */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Account Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="text-foreground">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Change */}
            <PasswordChangeSection />
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Profile;
