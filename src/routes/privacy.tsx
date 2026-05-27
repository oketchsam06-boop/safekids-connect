import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Data Protection — Tafuta Mtoto" },
      { name: "description", content: "How Tafuta Mtoto handles children's data under the Kenya Data Protection Act 2019." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-10 prose prose-sm dark:prose-invert">
        <h1>Privacy & Data Protection</h1>
        <p>
          Tafuta Mtoto processes personal data — including a child's photograph and last-seen details — for the sole
          purpose of locating and safely reunifying missing children. We operate in line with the
          <strong> Kenya Data Protection Act, 2019</strong>.
        </p>

        <h2>Lawful basis</h2>
        <ul>
          <li><strong>Consent</strong> from the parent or legal guardian, captured and versioned at submission.</li>
          <li><strong>Vital interests</strong> of the child during an active search.</li>
          <li><strong>Public task</strong> for cases handled by the National Police Service.</li>
        </ul>

        <h2>What we collect</h2>
        <ul>
          <li>Guardian: name, phone, email (account only).</li>
          <li>Child: first name, last-name initial, age, gender, last-seen time and location, description, photo.</li>
          <li>Sightings (from schools, shelters, hospitals, police): photo, time, location, notes.</li>
          <li>Operational logs of who accessed which record and when.</li>
        </ul>

        <h2>What we do NOT collect</h2>
        <ul>
          <li>National ID numbers of children.</li>
          <li>School name in any public-shareable field.</li>
          <li>Biometric templates beyond what is needed for a one-shot AI similarity suggestion.</li>
        </ul>

        <h2>Security</h2>
        <ul>
          <li>All photos are stored in a private, encrypted bucket — never publicly accessible.</li>
          <li>Photos are served only via short-lived signed links issued by an authenticated server function, and every access is audit-logged.</li>
          <li>Database access is governed by Row-Level Security; guardians only ever see their own cases.</li>
          <li>Sensitive role assignments (police, super-admin) are stored separately and verified by a security-definer function — they cannot be self-assigned.</li>
        </ul>

        <h2>AI & human verification</h2>
        <p>
          The platform uses AI as a similarity-scoring aid only. <strong>No action is ever taken on an AI suggestion alone.</strong>
          A trained police officer must review the side-by-side comparison and explicitly confirm a match, with a typed
          reason, before the guardian or any other party is notified.
        </p>

        <h2>Your rights</h2>
        <p>
          Guardians have the right to access, correct, and request deletion of their data, and to revoke consent at any
          time from Settings. Revocation closes any open case and triggers deletion of child photos within 24 hours,
          subject to lawful retention for active police investigations.
        </p>

        <h2>Retention</h2>
        <ul>
          <li>Closed cases: child photos purged after 90 days.</li>
          <li>Audit logs: retained for 2 years for accountability and investigations.</li>
        </ul>

        <h2>Contact & complaints</h2>
        <p>
          Data Protection Officer: <em>dpo@tafutamtoto.example</em>. You may also lodge a complaint with the Office of
          the Data Protection Commissioner (ODPC) at <a href="https://www.odpc.go.ke">odpc.go.ke</a>.
        </p>
      </main>
    </div>
  );
}
