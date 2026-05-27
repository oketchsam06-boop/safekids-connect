import "@/i18n";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { LangSwitch } from "./LangSwitch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const { t } = useTranslation();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          {t("brand")}
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            {t("nav.privacy")}
          </Link>
          <LangSwitch />
          {authed ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
