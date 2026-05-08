import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { getSupabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { emitSync, useSyncListener } from "@/lib/sync";

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  message_type: "text" | "system";
}

interface TeamMember {
  linked_user_id: string | null;
  github_login: string;
  name: string | null;
  avatar_url: string | null;
}

export const Route = createFileRoute("/projects/$projectId/messaging")({
  component: Messaging,
});

function Messaging() {
  const { projectId } = useParams({ from: "/projects/$projectId/messaging" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!project) {
      setMessages([]);
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();
        const [{ data: memberRows, error: memberError }, { data: messageRows, error: messageError }] =
          await Promise.all([
            supabase
              .from("project_team_members")
              .select("linked_user_id, github_login, name, avatar_url")
              .eq("project_id", project.id)
              .order("name", { ascending: true }),
            supabase
              .from("messages")
              .select("id, sender_id, content, created_at, message_type")
              .eq("project_id", project.id)
              .order("created_at", { ascending: true }),
          ]);

        if (!mounted) return;
        if (memberError) {
          console.error("Failed to load project team members:", memberError);
        }
        if (messageError) {
          console.error("Failed to load messages:", messageError);
        }

        const members = (memberRows ?? []).map((row: any) => ({
          linked_user_id: row.linked_user_id,
          github_login: row.github_login,
          name: row.name,
          avatar_url: row.avatar_url,
        })) as TeamMember[];
        const memberByUserId = new Map(
          members
            .filter((member) => Boolean(member.linked_user_id))
            .map((member) => [member.linked_user_id as string, member] as const)
        );

        const loadedMessages = (messageRows ?? []).map((row: any) => {
          const member = row.sender_id ? memberByUserId.get(row.sender_id) : null;
          const isCurrentUser = row.sender_id === user?.id;
          return {
            id: row.id,
            sender_id: row.sender_id,
            sender_name:
              (isCurrentUser ? (user?.user_metadata as any)?.user_name || user?.email : null) ||
              member?.name ||
              member?.github_login ||
              (row.sender_id ? row.sender_id.slice(0, 8) : "Unknown"),
            sender_avatar:
              (isCurrentUser ? (user?.user_metadata as any)?.avatar_url : null) || member?.avatar_url || undefined,
            content: row.content,
            created_at: row.created_at,
            message_type: row.message_type === "system" ? "system" : "text",
          } as Message;
        });

        setTeamMembers(members);
        setMessages([
          {
            id: `system-${project.id}`,
            sender_id: "system",
            sender_name: "System",
            content: `Welcome to the messaging channel for ${project.repo}. Collaborate with your team here.`,
            created_at: new Date().toISOString(),
            message_type: "system",
          },
          ...loadedMessages,
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [project, tick]);

  const handleSend = async () => {
    if (!input.trim() || !user || !project) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("messages")
        .insert({
          project_id: project.id,
          sender_id: user.id,
          content,
          message_type: "text",
        })
        .select("id, sender_id, content, created_at, message_type")
        .single();

      if (error) throw error;

      const memberByUserId = new Map(
        teamMembers
          .filter((member) => Boolean(member.linked_user_id))
          .map((member) => [member.linked_user_id as string, member] as const)
      );
      const member = memberByUserId.get(user.id);
      const newMsg: Message = {
        id: data.id,
        sender_id: data.sender_id,
        sender_name: (user.user_metadata as any)?.user_name || user.email || member?.github_login || "You",
        sender_avatar: (user.user_metadata as any)?.avatar_url || member?.avatar_url || undefined,
        content: data.content,
        created_at: data.created_at,
        message_type: data.message_type === "system" ? "system" : "text",
      };

      setMessages((prev) => [...prev, newMsg]);
      emitSync(project.id);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInput(content); // restore input on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Team Messaging</h1>

      <div className="glass rounded-xl overflow-hidden flex flex-col h-[calc(100vh-300px)]">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={msg.sender_avatar} />
                  <AvatarFallback>{msg.sender_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold">{msg.sender_name}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                  </div>
                  <p className="text-sm break-words mt-0.5 text-foreground/90">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t border-border p-4 bg-surface/50">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              size="icon"
              className="shrink-0"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
