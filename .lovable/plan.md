## MVP scope

Build a secure web MVP for reporting missing children, AI-assisted face matching, and human-verified reunification — adapted to this project's stack (TanStack Start + Lovable Cloud). Heavy Django/MySQL/face_recognition stack from the original brief is replaced with edge-runtime equivalents; the security/privacy/ethics commitments are kept intact.

## Stack (substitutions explained)

- Frontend: TanStack Start + React + Tailwind (shadcn/ui), i18n (English + Swahili) via `react-i18next`.
- Backend: TanStack `createServerFn` + server routes (Cloudflare Worker runtime).
- DB + Auth + Storage: Lovable Cloud (Supabase Postgres, Auth, Storage) — replaces MySQL. Postgres + RLS is materially safer for this use case than MySQL.
- AI face matching: Lovable AI Gateway (Gemini multimodal) for visual similarity scoring of a sighting vs. reported-child gallery, returning a structured confidence score + reasoning. `face_recognition`/OpenCV/DeepFace cannot run on the Worker runtime; if true biometric embeddings are later required, we'd add an external Python microservice (out of MVP scope).
- Maps: Leaflet + OpenStreetMap (no API key, Kenya-appropriate).

## Roles (RBAC)

`parent_guardian`, `police_admin`, `school_shelter`, `super_admin`. Stored in a separate `user_roles` table with a `has_role()` SECURITY DEFINER function (never on profiles, never client-trusted).

## Data model (Lovable Cloud / Postgres + RLS)

- `profiles` — display name, phone, preferred_language, org_id (nullable).
- `organizations` — police stations, schools, shelters, hospitals. `type`, `name`, `county`, verified flag.
- `user_roles` — `(user_id, role)` unique, app_role enum.
- `consents` — guardian consent records (purpose, version, signed_at, ip, revoked_at). Required before any photo upload.
- `missing_children` — case record: child first name only + initial, age, gender, last_seen_at, last_seen_lat/lng, last_seen_description, status (`open|under_review|matched|closed`), reporter_id, created_at. No national ID, no school name on the public-shareable fields.
- `child_photos` — storage path, encrypted-at-rest (Supabase default), uploaded_by, sha256, is_primary. Private bucket.
- `sightings` — submitted by schools/shelters/hospitals/public-tip role; photo path, location, notes, status.
- `match_candidates` — `(sighting_id, missing_child_id, ai_score, ai_rationale, reviewer_id, decision: pending|confirmed|rejected|escalated, decided_at)`. Nothing acts on a match until `confirmed` by `police_admin`.
- `notifications` — in-app + email queue (guardian + assigned officer).
- `audit_logs` — every read of a child photo, every match decision, every export. Append-only via trigger; readable only by `super_admin`.
- `emergency_contacts` — per child: name, relation, phone, priority.
- `case_updates` — timeline entries per case.

All tables: RLS ON. Explicit `GRANT` to `authenticated` + `service_role`. Public `anon` reads only on `organizations` (directory).

## Key RLS rules

- Guardians: see only their own cases, photos, contacts.
- Police admins: see all open cases + sightings + match candidates.
- Schools/shelters: see only their own submitted sightings + a redacted public registry (first name + age + last-seen city, no photo) for cross-reference.
- Photos: never publicly readable. Served via short-lived signed URLs from a server function that also writes an `audit_logs` row.

## Pages / routes

Public:
- `/` — landing (mission, how it works, emergency hotline, language toggle).
- `/login`, `/signup` (guardians) — email/password + Google.
- `/report` — public emergency tip (no account, rate-limited, captcha-ish honeypot).

Authenticated (`_authenticated/`):
- `/dashboard` — role-aware home.
- `/cases/new` — guardian wizard: consent → child info → photos → emergency contacts → last-seen + map.
- `/cases/$caseId` — case detail, timeline, status, match candidates (guardian sees confirmed only).
- `/sightings/new` — school/shelter form (photo + location + notes).
- `/review` — police: queue of AI match candidates, side-by-side compare, confirm/reject/escalate, requires typed reason + 2-step confirm.
- `/admin/audit` — super_admin only.
- `/settings` — profile, language (EN/SW), MFA enrollment prompt.

## AI face-matching workflow

1. Sighting uploaded → server function generates signed URLs for the sighting photo + each open case's primary photo.
2. Server fn calls Lovable AI (Gemini multimodal) with structured output schema `{score: 0-1, rationale: string, observable_features: string[]}` per candidate, top-K by metadata pre-filter (age range ±2, gender, county proximity).
3. Scores ≥ 0.6 written to `match_candidates` as `pending`. Nothing else happens automatically.
4. Police reviewer opens `/review`, sees both photos + AI rationale + case metadata. Must click "Confirm match" with typed reason. Only then are guardian + station notified.
5. Every step audit-logged.

This is explicitly **decision support, not decision making**. UI copy makes that clear; no auto-alerts, no auto-published matches.

## Authentication & sessions

- Lovable Cloud Auth: email/password + Google. MFA (TOTP) encouraged for police/admin roles, enforced via a gate on `/review` and `/admin/*`.
- `requireSupabaseAuth` middleware on every server function. `getUser()` (not `getSession()`) for any trust-bearing check.
- HIBP leaked-password check enabled.
- Session rotation on role change.

## Security strategy

- All photos in a private bucket; access only via server-fn-issued signed URLs (≤60s TTL) that also write an audit log row.
- Rate limiting on `/api/public/tip` and login (IP + email).
- Zod validation on every server fn input; max sizes on uploads (≤8MB, jpeg/png/webp only, server-side mime sniff).
- CSP, HTTPS-only (platform default), no `dangerouslySetInnerHTML`.
- RLS as a backstop; server-fn middleware as the primary gate.
- Audit log append-only via trigger; immutable from app code.
- No PII in client console; structured server logs only.

## Privacy & legal (Kenya Data Protection Act 2019)

Build-time artifacts:
- `/privacy` page: lawful basis (consent for minors via guardian + vital interests for emergency), data categories, retention, rights (access, rectification, erasure), DPO contact placeholder, ODPC complaint link.
- `/consent` versioned consent text stored in `consents` table; required before photo upload; revocable from settings (revocation closes the case and soft-deletes photos after 24h grace).
- Data retention job (cron via `/api/public/cron/retention`): closed cases purge photos after 90 days; audit logs retained 2 years.
- Data minimization: no national ID, no school name in public fields; child surname stored only encrypted (column-level via Supabase Vault) and shown only to reviewing officer.
- DPIA summary doc in repo (`/docs/DPIA.md`).
- CCTV integration: explicitly out of scope for MVP and called out in docs (requires separate DPIA and ODPC registration).

## Ethical AI safeguards

- Human-in-the-loop required for every action.
- Confidence score shown with explicit "AI suggestion, not verification" label.
- Threshold tunable per deployment; default 0.6 to surface, 0.85 visual highlight, never auto-confirm.
- Bias note in docs: Gemini is general-purpose, not trained specifically for African children's faces; reviewers warned to weight AI low, weight physical/contextual evidence high.
- No facial recognition against random public images; only sighting-uploads from authorized reporters.

## i18n

`react-i18next` with `en` and `sw` namespaces. Language toggle in header, persisted per user. All UI strings externalized from day one.

## Notifications

In-app notifications table + email via Lovable Cloud (Resend-style transactional). SMS is out of MVP scope (Africa's Talking integration noted as future work).

## Deliverable checklist (build order)

1. Enable Lovable Cloud; create schema + RLS + roles + audit triggers.
2. Auth flows (signup/login/MFA prompt) + i18n scaffold (EN/SW).
3. Guardian case wizard with consent gate + private photo upload.
4. School/shelter sighting form + map (Leaflet).
5. AI match server fn + `match_candidates` write.
6. Police review queue with confirm/reject/escalate + audit log.
7. Notifications + case timeline.
8. Admin audit page + retention cron + `/privacy` + `/consent` + `/docs/DPIA.md`.
9. Rate limiting, signed-URL photo serving, hardening pass.

## What's intentionally out of MVP scope

- True biometric embeddings (face_recognition/DeepFace) — would require an external Python service; flagged for v2.
- CCTV ingestion — legal and infra burden too high for MVP; documented as v2 with required DPIA.
- SMS/USSD alerts — v2 (Africa's Talking).
- Native mobile app — web is mobile-responsive; PWA install supported.
- Cross-border data sharing with Interpol/AMBER-style networks — v2.

## Confirmations needed before I build

If you want any of the deferred items pulled into the MVP, tell me now. Otherwise I'll proceed with the plan above as soon as you approve.
