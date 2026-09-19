import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, Check, Plus, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentOrg } from "@/lib/current-org";

export function OrgSwitcher() {
  const { orgs, currentOrg, switchOrg } = useCurrentOrg();
  const navigate = useNavigate();

  if (orgs.length === 0) {
    {/* ponytail: direct Link with standard button styles avoids asChild prop mismatches */}
    return (
      <Link
        to="/onboarding"
        className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium gap-2 text-foreground hover:bg-surface-elevated transition-colors"
      >
        <Plus className="size-3.5" /> Create org
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-between rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium gap-2 text-foreground hover:bg-surface-elevated transition-colors max-w-[200px]">
        <span className="flex items-center gap-2 min-w-0">
          <Building2 className="size-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs">{currentOrg?.name ?? "Select org"}</span>
        </span>
        <ChevronsUpDown className="size-3.5 opacity-60 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 bg-popover border-border text-xs">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Your organizations
        </DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className="flex items-center gap-2 text-xs text-foreground hover:text-foreground focus:bg-accent cursor-pointer"
          >
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate font-medium">{org.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{org.slug}</div>
            </div>
            {currentOrg?.id === org.id && <Check className="size-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={() => navigate({ to: "/onboarding" })}
          className="flex items-center gap-2 text-xs text-foreground hover:text-foreground focus:bg-accent cursor-pointer"
        >
          <Plus className="size-4" /> Create new organization
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate({ to: "/settings" })}
          className="flex items-center gap-2 text-xs text-foreground hover:text-foreground focus:bg-accent cursor-pointer"
        >
          Manage organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
