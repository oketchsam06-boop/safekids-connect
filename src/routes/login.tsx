import "@/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { syncMyAccount } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Tafuta Mtoto" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const syncAccount = useServerFn(syncMyAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showVerifyNotice = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("verify") === "1";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        return;
      }

      void syncAccount({ data: {} }).catch((syncError) => {
        console.error("Account sync after login failed", syncError);
      });
      nav({ to: "/dashboard", replace: true });
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) toast.error("Google sign-in failed");
    if (!result.error && !result.redirected) {
      void syncAccount({ data: {} }).catch((syncError) => {
        console.error("Account sync after Google login failed", syncError);
      });
      nav({ to: "/dashboard", replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.signIn")}</CardTitle>
          </CardHeader>
          <CardContent>
            {showVerifyNotice && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Verify your email</p>
                  <p className="mt-1 text-xs leading-relaxed">
                    We sent a confirmation link to your email address. Please open your inbox,
                    click the link, and then return here to sign in.
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : t("auth.signIn")}
              </Button>
            </form>
            <div className="my-4 text-center text-xs text-muted-foreground">{t("auth.or")}</div>
            <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
              {t("auth.google")}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="text-primary underline">
                {t("auth.signUp")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
