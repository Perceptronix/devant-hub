import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Github, Trash2 } from "lucide-react";
import { demoDepartments } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — DevANT" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const meta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  return (
    <>
      <PageHeader title="Settings" />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="depts">Departments</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
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

        <TabsContent value="org">
          <Card>
            <Field label="Organization name"><Input defaultValue="Perceptronix" /></Field>
            <Field label="Slug"><Input defaultValue="perceptronix" /></Field>
            <Button>Save</Button>
          </Card>
        </TabsContent>

        <TabsContent value="depts">
          <Card>
            <div className="space-y-2">
              {demoDepartments.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                  <div className="flex items-center gap-2">
                    <span>{d.icon}</span>
                    <span>{d.name}</span>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: d.color, color: d.color }}>{d.color}</Badge>
                  </div>
                  <Button variant="ghost" size="icon"><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
            <Button className="mt-4">Add Department</Button>
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
              <Button variant="outline">{user ? "Disconnect" : "Connect"}</Button>
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

        <TabsContent value="danger">
          <Card className="border-danger/40">
            <h3 className="font-display font-semibold mb-2 text-danger">Delete Organization</h3>
            <p className="text-sm text-muted-foreground mb-4">This will permanently remove all data, projects, and team members. This cannot be undone.</p>
            <Button variant="destructive">Delete Organization</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-xl p-6 mt-4 max-w-2xl animate-fade-up ${className}`}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
