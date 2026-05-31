import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Verifying… — Tafuta Mtoto" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errDesc = url.searchParams.get("error_description") || url.searchParams.get("error");

        if (errDesc) {
          setError(errDesc);
          return;
        }

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setError(exErr.message);
            return;
          }
        }

        // Wait for session (covers hash-based tokens auto-detected by supabase-js)
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (cancelled) return;
        nav({ to: "/dashboard", replace: true });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Verification failed");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-destructive">Verification failed</p>
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
            <a href="/login" className="mt-4 inline-block text-sm text-primary underline">
              Go to sign in
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}
      </div>
    </div>
  );
}
