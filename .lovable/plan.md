# Plan: Connect the three user surfaces

## Confirming the architecture

- **One signup, no role picker.** Everyone signs up the same way and gets `parent_guardian` automatically (already wired via the `handle_new_user` trigger).
- **Roles are granted, not chosen.** Only `super_admin` (CWSK) can promote a user to `police_admin` — enforced by RLS on `user_roles`.
- **All three surfaces share the same database, same AI, same case/sighting pipeline.** A sighting reported by a parent is matched against cases uploaded by both parents and police stations. Matches flow into the officer review queue and the CWSK dashboard.

## Phase 1 — Super Admin Dashboard (CWSK)

New route: `/_authenticated/admin/index.tsx` (gated to `super_admin`)

One screen showing the full picture:
- **Top stats:** total open cases, matched, found, total sightings, pending matches, registered officers
- **Cases table:** filterable by status (open / matched / found / closed) and county, with child name, age, reporter type (parent vs station), date, status
- **Recent sightings feed**
- **Pending matches** awaiting officer review
- **Quick links** to existing audit log and (Phase 2) user management

New server fn: `getSuperAdminOverview` in `src/lib/admin.functions.ts` — returns all the above in one call, gated by `has_role(uid, 'super_admin')`.

## Phase 2 — Role Management UI

New route: `/_authenticated/admin/users.tsx` (super_admin only)

- List all users with their current roles, full name, phone, signup date
- Search by name / email / phone
- Action: **Promote to police_admin** / **Demote** / **Promote to super_admin**
- Optional: assign officer to an organization (station) — uses existing `organizations` table

New server fns in `src/lib/admin.functions.ts`:
- `listAllUsers` (super_admin only)
- `grantRole({ user_id, role })` (super_admin only — writes to `user_roles`, audit-logged)
- `revokeRole({ user_id, role })` (super_admin only)
- `assignOfficerToOrg({ user_id, org_id })` (super_admin only)

## Phase 3 — Found-Child Workflow + Officer Case Upload

### 3a. Status flow
Current: `open → matched`. Add: `matched → found` and `open → found` (in case a child is recovered without an AI match), plus `→ closed` for false reports.

Migration: extend the status check / add a `found_at` timestamp and `found_notes` column on `missing_children`.

### 3b. Officer "mark as found" action
On the case detail page (when viewer is `police_admin` or `super_admin`):
- Button: **Mark child as found** → opens a small form (date, circumstances, was-reunified-with-family)
- Server fn: `markCaseFound({ case_id, notes })` — updates status, notifies the parent who filed it, writes a `case_updates` row, audit-logged

### 3c. Separate officer case-upload flow
New route: `/_authenticated/officer/cases/new.tsx` (police_admin / super_admin only)

Extends the parent form with station-specific fields:
- Police case file number (OB number)
- Reporting station / organization (dropdown from `organizations`)
- Investigating officer name
- Date case was opened at the station

Migration: add `case_file_number`, `station_org_id`, `investigating_officer`, `source` (`'parent' | 'station'`) columns to `missing_children`.

New server fn: `createStationCase` — same as `createCase` but accepts and stores the station fields, and tags `source = 'station'`. Reuses the same photo upload and AI matching pipeline so a station-uploaded case is matched against incoming sightings exactly like a parent-filed one.

### 3d. Officer landing page
New route: `/_authenticated/officer/index.tsx` — entry point for officers showing their station's cases, the review queue link, and the "Upload station case" button.

## Navigation updates

`SiteHeader.tsx` shows different nav based on role (reads from `user_roles`):
- Everyone: Dashboard, Report Missing, Report Sighting
- police_admin: + Review Queue, + Officer Console
- super_admin: + CWSK Dashboard, + User Management, + Audit Log

## Order of execution (per your answer)

1. Super admin dashboard + `getSuperAdminOverview` server fn
2. User management page + grant/revoke role server fns
3. Status migration → mark-as-found action → officer case-upload flow → officer landing page

## Technical notes

- All new server fns use `requireSupabaseAuth` + `has_role` check at the top.
- All role-changing actions write to `audit_logs`.
- Match pipeline (`createSighting`) needs **no changes** — it already pulls every open case regardless of who filed it, so station-uploaded cases automatically participate in AI matching.
- RLS already enforces super_admin-only writes to `user_roles`.
- I'll batch each phase as one logical commit so you can preview after each.
