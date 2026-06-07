import "@/i18n";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAllUsers,
  listOrganizations,
  grantRole,
  revokeRole,
  assignOfficerToOrg,
} from "@/lib/admin.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  parent_guardian: "Parent / Guardian",
  school_shelter: "School / Shelter",
  police_admin: "Police Officer",
  super_admin: "Super Admin (CWSK)",
};

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "User management — Tafuta Mtoto" }] }),
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listAllUsers);
  const fetchOrgs = useServerFn(listOrganizations);
  const doGrant = useServerFn(grantRole);
  const doRevoke = useServerFn(revokeRole);
  const doAssign = useServerFn(assignOfficerToOrg);

  const usersQ = useQuery({ queryKey: ["all-users"], queryFn: () => fetchUsers() });
  const orgsQ = useQuery({ queryKey: ["orgs"], queryFn: () => fetchOrgs() });

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const list = usersQ.data ?? [];
    if (!q) return list;
    const needle = q.toLowerCase();
    return list.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(needle) ||
        u.phone?.toLowerCase().includes(needle) ||
        u.id.toLowerCase().includes(needle),
    );
  }, [usersQ.data, q]);

  async function handleGrant(userId: string, role: string) {
    try {
      await doGrant({ data: { user_id: userId, role: role as never } });
      toast.success(`Granted ${ROLE_LABELS[role] ?? role}`);
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleRevoke(userId: string, role: string) {
    if (!confirm(`Revoke "${ROLE_LABELS[role] ?? role}" from this user?`)) return;
    try {
      await doRevoke({ data: { user_id: userId, role: role as never } });
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleAssignOrg(userId: string, orgId: string) {
    try {
      await doAssign({ data: { user_id: userId, org_id: orgId === "none" ? null : orgId } });
      toast.success("Station assignment updated");
      qc.invalidateQueries({ queryKey: ["all-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">User management</h1>
          <p className="text-sm text-muted-foreground">
            Promote users to officer or super admin, and assign officers to a station.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              All users ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by name, phone, or user id"
              className="mb-3 max-w-md"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {usersQ.isLoading && <p>Loading…</p>}
            {usersQ.error && (
              <p className="text-destructive">{(usersQ.error as Error).message}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Roles</th>
                    <th className="p-2">Station</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b align-top">
                      <td className="p-2">
                        <div>{u.full_name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {u.id.slice(0, 12)}…
                        </div>
                      </td>
                      <td className="p-2">{u.phone ?? "—"}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 && (
                            <span className="text-xs text-muted-foreground">none</span>
                          )}
                          {u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={r === "super_admin" ? "default" : "secondary"}
                              className="cursor-pointer"
                              title="Click to revoke"
                              onClick={() => handleRevoke(u.id, r)}
                            >
                              {ROLE_LABELS[r] ?? r} ✕
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-2">
                        {u.roles.includes("police_admin") || u.roles.includes("super_admin") ? (
                          <Select
                            value={u.org?.id ?? "none"}
                            onValueChange={(v) => handleAssignOrg(u.id, v)}
                          >
                            <SelectTrigger className="h-8 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              <SelectItem value="none">— none —</SelectItem>
                              {(orgsQ.data ?? []).map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                  {o.name} ({o.org_type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Select onValueChange={(role) => handleGrant(u.id, role)}>
                          <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue placeholder="+ Grant role" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS)
                              .filter(([k]) => !u.roles.includes(k))
                              .map(([k, label]) => (
                                <SelectItem key={k} value={k}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
