
## What you'll be able to do as an officer

1. Register at `/signup/officer` with a **station code** → instantly get the `police_admin` role.
2. Alternatively, a `super_admin` can promote any existing user from a new **Admin → Users** page.
3. From a new **Station Intake** page, upload photos of unidentified children present at your station (separate from guardian cases).
4. When the AI matcher links an intake/sighting to an open case, you see it in `/review`. Confirming the match automatically:
   - creates an in‑app notification for the guardian (reporter),
   - sends an SMS to the guardian's phone via Twilio.

## Build steps

1. **Connect Twilio** (one-time): I'll trigger the Twilio connector picker so you can link an account + sender number.
2. **Database migration**
   - New table `station_intakes` (officer_id, station, child photos, age estimate, notes, status, created_at) + RLS so only police/super-admin can read/write.
   - New `child_photos`-style storage path under existing `child-photos` bucket (sub-folder `intakes/`).
   - New table `alerts_log` (guardian_id, match_id, channel sms|in_app, status, error, sent_at) for auditing.
   - Update `handle_new_user` trigger to read `raw_user_meta_data->>'signup_role'` + `station_code`: if code matches the `OFFICER_STATION_CODE` secret, assign `police_admin` instead of `parent_guardian`.
   - Add `phone` to profiles is already there ✔.
3. **Secrets**: add `OFFICER_STATION_CODE` (you set the value).
4. **Frontend**
   - `/signup/officer` — name, email, password, phone, station name, station code.
   - `/_authenticated/admin/users` (super_admin only) — list users, promote/demote roles.
   - `/_authenticated/intake` (police_admin) — upload child photos at station, list active intakes.
5. **Server functions**
   - `createStationIntake` — uploads photos, inserts row.
   - `confirmMatchAndAlert` — replaces current "confirm" action in `/review`. After updating `match_candidates.decision = 'confirmed'`, it loads the guardian's profile, inserts a notification row, then calls Twilio via the connector gateway to SMS the guardian. Failures logged to `alerts_log`, never block the confirm.

## Things you'll need to do

- **Pick the station code** (any string, e.g. `KPS-2026-NAIROBI`). I'll prompt for it as a secret.
- **Connect Twilio** when the picker opens, with a sender number that can SMS Kenyan numbers.
- (Optional later) Add email channel — you opted out for now; easy to add by enabling Lovable Emails + a domain.

After you approve, I'll start with the Twilio connection, then the migration, then the code.
