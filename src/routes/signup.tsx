import "@/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — Tafuta Mtoto" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const syncAccount = useServerFn(syncMyAccount);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: { full_name: fullName, phone },
        },
      });
      if (error) {
        setFormError(error.message);
        toast.error(error.message);
        return;
      }
      if (data.session) {
        try {
          await syncAccount({ data: { full_name: fullName, phone } });
        } catch (syncError) {
          console.error("Account sync after signup failed", syncError);
          toast.warning("Account created, but setup will finish on the dashboard.");
        }
        toast.success("Account created successfully.");
        nav({ to: "/dashboard", replace: true });
        return;
      }
      toast.success("Check your email to verify your account.");
      nav({ to: "/login" });
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
      await syncAccount({ data: { full_name: fullName, phone } });
      nav({ to: "/dashboard" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("auth.signUp")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-muted-foreground">{t("auth.signupBlurb")}</p>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="fn">{t("auth.fullName")}</Label>
                <Input
                  id="fn"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ph">{t("auth.phone")}</Label>
                <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="em">{t("auth.email")}</Label>
                <Input
                  id="em"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pw">{t("auth.password")}</Label>
                <Input
                  id="pw"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : t("auth.signUp")}
              </Button>
            </form>
            <div className="my-4 text-center text-xs text-muted-foreground">{t("auth.or")}</div>
            <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
              {t("auth.google")}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t("auth.haveAccount")}{" "}
              <Link to="/login" className="text-primary underline">
                {t("auth.signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
