import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { emitSync } from "@/lib/sync";
import { Github, Sun, Moon, Plus, Trash2, Loader2, Copy, Mail, Check, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createOrgInvite } from "@/lib/org-invites";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — DevANT" }] }),
  component: Settings,
});

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  github_org_login?: string;
  created_at: string;
}

interface OrgMember {
  id: string;
  user_id: string | null;
  email?: string;
  invited_email?: string;
  role: "owner" | "admin" | "member";
  status: "accepted" | "pending" | "declined";
  invited_at: string;
  joined_at?: string;
}

interface Department {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

function Settings() {
  const { user } = useAuth();
  const meta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const [theme, setTheme] = useTheme();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [openCreateOrg, setOpenCreateOrg] = useState(false);
  const [openInviteMember, setOpenInviteMember] = useState(false);
  const [openCreateDept, setOpenCreateDept] = useState(false);

  // Load user organizations
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabase();
        // Query 1: owned orgs
        const { data: ownedOrgs, error: ownError } = await supabase
          .from("organizations")
          .select("id, name, slug, github_org_login, owner_id, created_at")
          .eq("owner_id", user.id);

        // Query 2: member orgs
        const { data: memberOrgIds, error: memberError } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("status", "accepted");

        if (ownError || memberError) throw ownError || memberError;
        if (!mounted) return;

        // Get org IDs from member query
        const memberOrgIdSet = new Set(
          (memberOrgIds || []).map((m: { org_id: string }) => m.org_id),
        );

        // Fetch member orgs if any
        let memberOrgs: Organization[] = [];
        if (memberOrgIdSet.size > 0) {
          const { data: mOrgs, error: fetchError } = await supabase
            .from("organizations")
            .select("id, name, slug, github_org_login, owner_id, created_at")
            .in("id", Array.from(memberOrgIdSet));

          if (fetchError) throw fetchError;
          memberOrgs = (mOrgs || []) as Organization[];
        }

        // Combine and deduplicate
        const allOrgs = [...(ownedOrgs || []), ...memberOrgs].reduce((acc, org) => {
          if (!acc.find((existingOrg) => existingOrg.id === org.id)) acc.push(org);
          return acc;
        }, [] as Organization[]);

        setOrgs(allOrgs);
        if (allOrgs.length > 0) {
          setSelectedOrg(allOrgs[0]);
        }
      } catch (err) {
        console.error("Failed to load organizations:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Load departments and members when org selected
  useEffect(() => {
    if (!selectedOrg) {
      setDepartments([]);
      setMembers([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const [{ data: deptData }, { data: membersData }] = await Promise.all([
          supabase
            .from("departments")
            .select("id, org_id, name, description, color, created_at")
            .eq("org_id", selectedOrg.id),
          supabase
            .from("org_members")
            .select("id, user_id, role, status, invited_at, invited_email, joined_at")
            .eq("org_id", selectedOrg.id),
        ]);

        if (!mounted) return;
        setDepartments((deptData || []) as Department[]);
        setMembers((membersData || []) as OrgMember[]);
      } catch (err) {
        console.error("Failed to load org data:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedOrg]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim() || !user) {
      toast.error("Organization name and slug are required");
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("organizations")
        .insert({
          name: newOrgName.trim(),
          slug: newOrgSlug.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setOrgs((prev) => [...prev, data as Organization]);
      setSelectedOrg(data as Organization);
      setNewOrgName("");
      setNewOrgSlug("");
      setOpenCreateOrg(false);
      toast.success("Organization created");
    } catch (err) {
      console.error("Failed to create organization:", err);
      toast.error("Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim() || !selectedOrg) {
      toast.error("Department name is required");
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("departments")
        .insert({
          org_id: selectedOrg.id,
          name: newDeptName.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setDepartments((prev) => [...prev, data as Department]);
      setNewDeptName("");
      setOpenCreateDept(false);
      toast.success("Department created");
    } catch (err) {
      console.error("Failed to create department:", err);
      toast.error("Failed to create department");
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedOrg) {
      toast.error("Email is required");
      return;
    }

    const emailToInvite = inviteEmail.trim().toLowerCase();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToInvite)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setCreating(true);
    try {
      await (
        createOrgInvite as unknown as (options: {
          data: {
            orgId: string;
            invitedEmail: string;
            inviterId: string;
            inviterName: string;
            inviterEmail: string;
            baseUrl: string;
          };
        }) => Promise<unknown>
      )({
        data: {
          orgId: selectedOrg.id,
          invitedEmail: emailToInvite,
          inviterId: user?.id ?? "",
          inviterName: meta.full_name || user?.email || "DevANT",
          inviterEmail: (user?.email ?? "").toLowerCase(),
          baseUrl: window.location.origin,
        },
      });

      toast.success(
        `Invite sent to ${emailToInvite}. They will receive an email with an Accept invitation button.`,
      );
      setInviteEmail("");
      setOpenInviteMember(false);

      // Reload members to show the new invite
      const supabase = getSupabase();
      const { data: membersData } = await supabase
        .from("org_members")
        .select("id, user_id, role, status, invited_at, invited_email, joined_at")
        .eq("org_id", selectedOrg.id);
      setMembers((membersData || []) as OrgMember[]);
      emitSync();
    } catch (err) {
      console.error("Failed to invite member:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send invite. Check that RESEND_API_KEY is configured.";
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("departments").delete().eq("id", deptId);
      if (error) throw error;
      setDepartments((prev) => prev.filter((d) => d.id !== deptId));
      toast.success("Department deleted");
    } catch (err) {
      console.error("Failed to delete department:", err);
      toast.error("Failed to delete department");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("org_members").delete().eq("id", memberId);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    } catch (err) {
      console.error("Failed to remove member:", err);
      toast.error("Failed to remove member");
    }
  };

  const isOrgOwner = selectedOrg && selectedOrg.owner_id === user?.id;

  return (
    <>
      <PageHeader title="Settings" />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="size-16">
                <AvatarImage src={meta.avatar_url} />
                <AvatarFallback>{(user?.email || "DA").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold">{meta.user_name || user?.email || "Guest"}</div>
                <div className="text-xs text-muted-foreground">
                  {user?.email || "Sign in to manage profile"}
                </div>
              </div>
            </div>
            <Field label="Display name">
              <Input defaultValue={meta.user_name || ""} />
            </Field>
            <Field label="Email">
              <Input defaultValue={user?.email || ""} />
            </Field>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <div className="space-y-4 max-w-3xl">
            {/* Org Selector */}
            {orgs.length > 0 && (
              <Card>
                <h3 className="font-display font-semibold mb-3">Your Organizations</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedOrg?.id === org.id
                          ? "bg-primary text-white"
                          : "bg-surface-elevated hover:bg-surface border border-border"
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Create Org */}
            <Card>
              <Dialog open={openCreateOrg} onOpenChange={setOpenCreateOrg}>
                <DialogTrigger asChild>
                  <Button className="gap-1.5">
                    <Plus className="size-4" /> Create Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Organization Name</Label>
                      <Input
                        placeholder="e.g. Acme Corp"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Slug (URL-friendly)</Label>
                      <Input
                        placeholder="e.g. acme-corp"
                        value={newOrgSlug}
                        onChange={(e) =>
                          setNewOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                        }
                      />
                    </div>
                    <Button
                      onClick={handleCreateOrg}
                      disabled={creating || !newOrgName.trim() || !newOrgSlug.trim()}
                      className="w-full"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>

            {/* Selected Org Details */}
            {selectedOrg && (
              <>
                {/* Departments */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Departments / Domains</h3>
                    {isOrgOwner && (
                      <Dialog open={openCreateDept} onOpenChange={setOpenCreateDept}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-1">
                            <Plus className="size-3" /> Add
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Department</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <Label>Name</Label>
                              <Input
                                placeholder="e.g. Engineering"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={handleCreateDept}
                              disabled={creating || !newDeptName.trim()}
                              className="w-full"
                            >
                              {creating ? (
                                <>
                                  <Loader2 className="size-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                "Create"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  {departments.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No departments yet</div>
                  ) : (
                    <div className="space-y-2">
                      {departments.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border"
                        >
                          <div>
                            <div className="font-medium text-sm">{dept.name}</div>
                            {dept.description && (
                              <div className="text-xs text-muted-foreground">
                                {dept.description}
                              </div>
                            )}
                          </div>
                          {isOrgOwner && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-muted-foreground hover:text-danger">
                                  <Trash2 className="size-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Delete Department?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone.
                                </AlertDialogDescription>
                                <div className="flex gap-3 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDept(dept.id)}
                                    className="bg-danger hover:bg-danger/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Members */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Members</h3>
                    {isOrgOwner && (
                      <Dialog open={openInviteMember} onOpenChange={setOpenInviteMember}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-1">
                            <Mail className="size-3" /> Invite
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Member</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div>
                              <Label>Email</Label>
                              <Input
                                placeholder="user@example.com"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={handleInviteMember}
                              disabled={creating || !inviteEmail.trim()}
                              className="w-full"
                            >
                              {creating ? (
                                <>
                                  <Loader2 className="size-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Send Invite"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  {members.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No members yet</div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {member.status === "pending" && member.invited_email
                                ? member.invited_email
                                : member.role}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  member.status === "accepted"
                                    ? "default"
                                    : member.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {member.status}
                              </Badge>
                            </div>
                          </div>
                          {isOrgOwner && member.role !== "owner" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-muted-foreground hover:text-danger">
                                  <Trash2 className="size-4" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  They will lose access to this organization.
                                </AlertDialogDescription>
                                <div className="flex gap-3 justify-end">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="bg-danger hover:bg-danger/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </div>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
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
                <div className="text-xs text-muted-foreground">
                  Scopes: repo, read:org, read:user
                </div>
              </div>
              <Button variant="outline">{user ? "Connected" : "Connect"}</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            {[
              "New commit",
              "PR opened",
              "PR merged",
              "Deploy success",
              "Deploy failure",
              "Issue opened",
            ].map((n) => (
              <div
                key={n}
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <Label>{n}</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span>Email</span>
                    <Switch />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>In-app</span>
                    <Switch defaultChecked />
                  </div>
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
