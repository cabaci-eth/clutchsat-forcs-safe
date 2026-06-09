import { useState } from "react";
import { MessageSquare, Plus, ArrowUp, ArrowDown, MessageCircle, Loader2, LogIn, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Thread = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  category_id: string | null;
  created_at: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_anonymous: boolean;
  edited_at: string | null;
  profiles: { username: string | null } | null;
  reply_count: number;
  upvotes: number;
};

const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const canEdit = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;

const displayName = (profiles: { username: string | null } | null, isAnonymous: boolean) => {
  if (isAnonymous) return "Anonymous";
  return profiles?.username || "Anonymous";
};

const Forum = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "upvoted">("recent");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editThreadContent, setEditThreadContent] = useState("");
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["forum_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("forum_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["forum_threads", sortBy, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("forum_threads_secure" as any)
        .select("*")
        .order("is_pinned", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const threadIds = (data || []).map((t: any) => t.id);
      if (threadIds.length === 0) return [];

      // Fetch profile usernames for non-anonymous threads
      const userIds = [...new Set((data || []).filter((t: any) => t.user_id).map((t: any) => t.user_id))];
      const profilesRes = userIds.length > 0
        ? await supabase.from("profiles_public" as any).select("user_id, username").in("user_id", userIds)
        : { data: [] };
      const profileMap: Record<string, string | null> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.username; });

      const [repliesRes, voteCountsRes] = await Promise.all([
        supabase.from("forum_replies_secure" as any).select("thread_id").in("thread_id", threadIds),
        supabase.rpc("get_vote_counts", { p_thread_ids: threadIds }),
      ]);

      const replyCounts: Record<string, number> = {};
      (repliesRes.data || []).forEach((r: any) => {
        replyCounts[r.thread_id] = (replyCounts[r.thread_id] || 0) + 1;
      });

      const voteCounts: Record<string, number> = {};
      ((voteCountsRes.data || []) as any[]).forEach((v: any) => {
        if (v.item_id) voteCounts[v.item_id] = Number(v.net_votes) || 0;
      });

      let result = (data || []).map((t: any) => ({
        ...t,
        profiles: t.user_id ? { username: profileMap[t.user_id] || null } : null,
        reply_count: replyCounts[t.id] || 0,
        upvotes: voteCounts[t.id] || 0,
      }));

      if (sortBy === "upvoted") {
        result.sort((a: Thread, b: Thread) => b.upvotes - a.upvotes);
      }

      return result as Thread[];
    },
  });

  const { data: threadDetail } = useQuery({
    queryKey: ["forum_thread_detail", selectedThread],
    enabled: !!selectedThread,
    queryFn: async () => {
      const [threadRes, repliesRes] = await Promise.all([
        supabase.from("forum_threads_secure" as any).select("*").eq("id", selectedThread!).single(),
        supabase.from("forum_replies_secure" as any).select("*").eq("thread_id", selectedThread!).order("created_at"),
      ]);
      if (threadRes.error) throw threadRes.error;
      const threadData = threadRes.data as any;
      const repliesData = (repliesRes.data || []) as any[];

      // Fetch profile usernames for visible user_ids
      const allUserIds = [
        ...(threadData?.user_id ? [threadData.user_id] : []),
        ...repliesData.filter((r: any) => r.user_id).map((r: any) => r.user_id),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];
      const profilesRes = uniqueUserIds.length > 0
        ? await supabase.from("profiles_public" as any).select("user_id, username").in("user_id", uniqueUserIds)
        : { data: [] };
      const profileMap: Record<string, string | null> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p.username; });

      const threadWithProfile = {
        ...threadData,
        profiles: threadData.user_id ? { username: profileMap[threadData.user_id] || null } : null,
      };
      const repliesWithProfiles = repliesData.map((r: any) => ({
        ...r,
        profiles: r.user_id ? { username: profileMap[r.user_id] || null } : null,
      }));

      // Get aggregate vote counts via RPC (no user_id exposure)
      const voteCountsRes = await supabase.rpc("get_vote_counts", { p_thread_ids: [selectedThread!] });
      const voteCounts: Record<string, number> = {};
      ((voteCountsRes.data || []) as any[]).forEach((v: any) => {
        if (v.item_id) voteCounts[v.item_id] = Number(v.net_votes) || 0;
      });

      // Get only the current user's own votes (for vote button UI state)
      let userVotes: any[] = [];
      if (user) {
        const replyIds = repliesWithProfiles.map((r: any) => r.id);
        const votesQuery = replyIds.length > 0
          ? supabase.from("forum_votes").select("*").or(`thread_id.eq.${selectedThread},reply_id.in.(${replyIds.join(",")})`)
          : supabase.from("forum_votes").select("*").eq("thread_id", selectedThread!);
        const votesRes = await votesQuery;
        userVotes = votesRes.data || [];
      }

      return {
        thread: threadWithProfile,
        replies: repliesWithProfiles,
        votes: userVotes,
        voteCounts,
      };
    },
  });

  const handleCreateThread = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("forum_threads").insert({
      title: title.trim().slice(0, 200),
      content: content.trim().slice(0, 10000),
      user_id: user.id,
      author_id: user.id,
      category_id: categoryId || null,
      is_anonymous: isAnonymous,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", variant: "destructive" });
    } else {
      setTitle(""); setContent(""); setCategoryId(""); setIsAnonymous(false);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
      toast({ title: "Thread created!" });
    }
  };

  const handleReply = async () => {
    if (!user || !replyContent.trim() || !selectedThread) return;
    // Check if thread is locked
    const t = threadDetail?.thread;
    if (t?.is_locked) {
      toast({ title: "Thread is locked", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("forum_replies").insert({
      thread_id: selectedThread,
      content: replyContent.trim().slice(0, 5000),
      user_id: user.id,
      author_id: user.id,
      is_anonymous: replyAnonymous,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", variant: "destructive" });
    } else {
      setReplyContent(""); setReplyAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ["forum_thread_detail", selectedThread] });
      queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    }
  };

  const handleEditThread = async () => {
    if (!editingThread || !editThreadContent.trim()) return;
    const { error } = await supabase.from("forum_threads")
      .update({ content: editThreadContent.trim().slice(0, 10000), edited_at: new Date().toISOString() })
      .eq("id", editingThread);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    setEditingThread(null);
    queryClient.invalidateQueries({ queryKey: ["forum_thread_detail", selectedThread] });
    toast({ title: "Thread updated" });
  };

  const handleDeleteThread = async (id: string) => {
    await supabase.from("forum_threads").delete().eq("id", id);
    setSelectedThread(null);
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    toast({ title: "Thread deleted" });
  };

  const handleEditReply = async () => {
    if (!editingReply || !editReplyContent.trim()) return;
    const { error } = await supabase.from("forum_replies")
      .update({ content: editReplyContent.trim().slice(0, 5000), edited_at: new Date().toISOString() })
      .eq("id", editingReply);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    setEditingReply(null);
    queryClient.invalidateQueries({ queryKey: ["forum_thread_detail", selectedThread] });
  };

  const handleDeleteReply = async (id: string) => {
    await supabase.from("forum_replies").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["forum_thread_detail", selectedThread] });
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
    toast({ title: "Reply deleted" });
  };

  const handleVote = async (threadId: string | null, replyId: string | null, voteType: "up" | "down") => {
    if (!user) { toast({ title: "Sign in to vote" }); return; }
    const existing = threadDetail?.votes?.find(
      (v: any) => v.user_id === user.id && (threadId ? v.thread_id === threadId : v.reply_id === replyId)
    );
    if (existing) {
      if (existing.vote_type === voteType) {
        await supabase.from("forum_votes").delete().eq("id", existing.id);
      } else {
        await supabase.from("forum_votes").update({ vote_type: voteType }).eq("id", existing.id);
      }
    } else {
      await supabase.from("forum_votes").insert({
        user_id: user.id, thread_id: threadId, reply_id: replyId, vote_type: voteType,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["forum_thread_detail", selectedThread] });
    queryClient.invalidateQueries({ queryKey: ["forum_threads"] });
  };

  const getVoteCount = (threadId: string | null, replyId: string | null) => {
    const targetId = threadId || replyId;
    if (!targetId || !threadDetail?.voteCounts) return 0;
    return threadDetail.voteCounts[targetId] || 0;
  };

  const getUserVote = (threadId: string | null, replyId: string | null) => {
    if (!user || !threadDetail?.votes) return null;
    const v = threadDetail.votes.find(
      (v: any) => v.user_id === user.id && (threadId ? v.thread_id === threadId : v.reply_id === replyId)
    );
    return v?.vote_type || null;
  };

  // Thread detail view
  if (selectedThread && threadDetail) {
    const t = threadDetail.thread;
    const isOwner = user?.id === (t.author_id || t.user_id);
    return (
      <Layout>
        <div className="container mx-auto max-w-3xl px-4 py-10">
          <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)} className="mb-4">
            ← Back to Forum
          </Button>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => handleVote(t.id, null, "up")} className={`p-1 rounded hover:bg-muted ${getUserVote(t.id, null) === "up" ? "text-primary" : "text-muted-foreground"}`}>
                  <ArrowUp className="h-5 w-5" />
                </button>
                <span className="text-sm font-bold text-foreground">{getVoteCount(t.id, null)}</span>
                <button onClick={() => handleVote(t.id, null, "down")} className={`p-1 rounded hover:bg-muted ${getUserVote(t.id, null) === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                  <ArrowDown className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="font-display text-2xl font-bold text-foreground">{t.title}</h1>
                  {isOwner && (
                    <div className="flex gap-1">
                      {canEdit(t.created_at) && (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingThread(t.id); setEditThreadContent(t.content); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete thread?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteThread(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <span className="font-medium text-primary">{displayName(t.profiles, t.is_anonymous)}</span>
                  <span>•</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  {t.edited_at && <span className="italic">(edited)</span>}
                  {t.is_locked && <span className="text-destructive font-medium">🔒 Locked</span>}
                </div>
                {editingThread === t.id ? (
                  <div className="space-y-2">
                    <Textarea value={editThreadContent} onChange={(e) => setEditThreadContent(e.target.value)} rows={4} maxLength={10000} />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingThread(null)}>Cancel</Button>
                      <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleEditThread}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-foreground whitespace-pre-wrap">{t.content}</p>
                )}
              </div>
            </div>
          </div>

          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            {threadDetail.replies.length} {threadDetail.replies.length === 1 ? "Reply" : "Replies"}
          </h3>

          <div className="space-y-3 mb-6">
            {threadDetail.replies.map((r: any) => {
              const isReplyOwner = user?.id === (r.author_id || r.user_id);
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <button onClick={() => handleVote(null, r.id, "up")} className={`p-0.5 rounded hover:bg-muted ${getUserVote(null, r.id) === "up" ? "text-primary" : "text-muted-foreground"}`}>
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-bold text-foreground">{getVoteCount(null, r.id)}</span>
                      <button onClick={() => handleVote(null, r.id, "down")} className={`p-0.5 rounded hover:bg-muted ${getUserVote(null, r.id) === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <span className="font-medium text-primary">{displayName(r.profiles, r.is_anonymous)}</span>
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          {r.edited_at && <span className="italic">(edited)</span>}
                          {r.is_solution && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Solution</span>}
                          {r.user_id === t.user_id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">OP</span>}
                        </div>
                        {isReplyOwner && (
                          <div className="flex gap-1">
                            {canEdit(r.created_at) && (
                              <Button variant="ghost" size="sm" onClick={() => { setEditingReply(r.id); setEditReplyContent(r.content); }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete reply?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteReply(r.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      {editingReply === r.id ? (
                        <div className="space-y-2">
                          <Textarea value={editReplyContent} onChange={(e) => setEditReplyContent(e.target.value)} rows={3} maxLength={5000} />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditingReply(null)}>Cancel</Button>
                            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={handleEditReply}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {t.is_locked ? (
            <div className="text-center py-6 text-muted-foreground">
              🔒 This thread is locked. No new replies can be posted.
            </div>
          ) : user ? (
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <Textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." rows={3} maxLength={5000} />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
                  <Checkbox checked={replyAnonymous} onCheckedChange={(c) => setReplyAnonymous(!!c)} />
                  <EyeOff className="h-3.5 w-3.5" /> Post anonymously
                </label>
                <Button className="gradient-primary text-primary-foreground" onClick={handleReply} disabled={submitting || !replyContent.trim()}>
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Button className="gradient-primary text-primary-foreground" asChild>
                <Link to="/login"><LogIn className="mr-1 h-4 w-4" /> Sign in to reply</Link>
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Forum</h1>
            <p className="mt-2 text-muted-foreground">Discuss SAT topics with fellow students.</p>
          </div>
          {user && (
            <Button className="gradient-primary text-primary-foreground" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="mr-1 h-4 w-4" /> New Thread
            </Button>
          )}
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 shadow-card mb-6 space-y-4">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title..." maxLength={200} />
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Category (optional)" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" rows={4} maxLength={10000} />
            <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
              <Checkbox checked={isAnonymous} onCheckedChange={(c) => setIsAnonymous(!!c)} />
              <EyeOff className="h-3.5 w-3.5" /> Post anonymously
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={handleCreateThread} disabled={submitting}>
                Post Thread
              </Button>
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="upvoted">Most Upvoted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {!user ? "Sign in to see if there are discussions happening!" : "No threads yet. Be the first to post!"}
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedThread(t.id)}
                className="w-full text-left rounded-2xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-xs font-bold text-foreground">{t.upvotes}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {t.is_pinned && <span className="text-xs font-medium text-primary">📌 Pinned</span>}
                      {t.is_locked && <span className="text-xs font-medium text-destructive">🔒</span>}
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">{t.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{displayName(t.profiles, t.is_anonymous)}</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {t.reply_count}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {!user && (
          <div className="text-center py-8 mt-6">
            <Button className="gradient-primary text-primary-foreground" asChild>
              <Link to="/login"><LogIn className="mr-1 h-4 w-4" /> Sign in to participate</Link>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Forum;
