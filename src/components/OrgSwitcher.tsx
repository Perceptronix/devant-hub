import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, Check, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  if (orgs.length === 0) {
    return (
      <Button asChild variant="outline" size="sm" className="h-9 gap-2">
        <Link to="/onboarding">
          <Plus className="size-3.5" /> Create org
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 max-w-[200px] justify-between"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Building2 className="size-3.5 shrink-0 text-primary" />
            <span className="truncate text-sm">{currentOrg?.name ?? "Select org"}</span>
          </span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Your organizations
        </DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className="flex items-center gap-2"
          >
            <Building2 className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{org.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{org.slug}</div>
            </div>
            {currentOrg?.id === org.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/onboarding" className="flex items-center gap-2">
            <Plus className="size-4" /> Create new organization
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            Manage organizations
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
