import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Github, Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — DevANT" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const meta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const [theme, setTheme] = useTheme();

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="size-16"><AvatarImage src={meta.avatar_url} /><AvatarFallback>{(user?.email || "DA").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              <div>
                <div className="font-semibold">{meta.user_name || user?.email || "Guest"}</div>
                <div className="text-xs text-muted-foreground">{user?.email || "Sign in to manage profile"}</div>
              </div>
            </div>
            <Field label="Display name"><Input defaultValue={meta.user_name || ""} /></Field>
            <Field label="Email"><Input defaultValue={user?.email || ""} /></Field>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <h3 className="font-display font-semibold mb-4">Theme</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center gap-3 p-4 rounded-lg border transition-colors ${theme === "light" ? "border-primary bg-primary/10" : "border-border hover:bg-surface-elevated"}`}
              >
                <Sun className="size-5" />
                <div className="text-left">
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-muted-foreground">Bright & clean</div>
                </div>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center gap-3 p-4 rounded-lg border transition-colors ${theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:bg-surface-elevated"}`}
              >
                <Moon className="size-5" />
                <div className="text-left">
                  <div className="font-medium">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface">
              <Github className="size-6" />
              <div className="flex-1">
                <div className="font-medium">GitHub</div>
                <div className="text-xs text-muted-foreground">Scopes: repo, read:org, read:user</div>
              </div>
              <Button variant="outline">{user ? "Connected" : "Connect"}</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            {["New commit", "PR opened", "PR merged", "Deploy success", "Deploy failure", "Issue opened"].map((n) => (
              <div key={n} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <Label>{n}</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs"><span>Email</span><Switch /></div>
                  <div className="flex items-center gap-2 text-xs"><span>In-app</span><Switch defaultChecked /></div>
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-xl p-6 mt-4 max-w-2xl">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
