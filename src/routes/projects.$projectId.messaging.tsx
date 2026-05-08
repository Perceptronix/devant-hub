import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { useSyncListener } from "@/lib/sync";

interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content: string;
  created_at: string;
  message_type: "text" | "system";
}

export const Route = createFileRoute("/projects/$projectId/messaging")({
  component: Messaging,
});

function Messaging() {
  const { projectId } = useParams({ from: "/projects/$projectId/messaging" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
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
    if (!project) return;
    setLoading(true);
    // TODO: Fetch messages from Supabase
    // For now, simulate some messages
    setTimeout(() => {
      setMessages([
        {
          id: "1",
          sender_id: "system",
          sender_name: "System",
          content: `Welcome to the messaging channel for ${project.repo}. Collaborate with your team here.`,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          message_type: "system",
        },
      ]);
      setLoading(false);
    }, 500);
  }, [project, tick]);

  const handleSend = async () => {
    if (!input.trim() || !user || !project) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      // TODO: Send message to Supabase
      const newMsg: Message = {
        id: Date.now().toString(),
        sender_id: user.id,
        sender_name: (user.user_metadata as any)?.user_name || user.email,
        sender_avatar: (user.user_metadata as any)?.avatar_url,
        content,
        created_at: new Date().toISOString(),
        message_type: "text",
      };
      setMessages((prev) => [...prev, newMsg]);
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
