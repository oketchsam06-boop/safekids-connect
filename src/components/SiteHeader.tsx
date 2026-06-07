import "@/i18n";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { LangSwitch } from "./LangSwitch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyContext } from "@/lib/auth.functions";

export function SiteHeader() {
  const { t } = useTranslation();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchCtx = useServerFn(getMyContext);
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchCtx(),
    enabled: authed,
  });
  const roles = me?.roles ?? [];
  const isOfficer = roles.includes("police_admin");
  const isAdmin = roles.includes("super_admin");

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          {t("brand")}
        </Link>
        <nav className="flex items-center gap-2">
          {authed && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              {(isOfficer || isAdmin) && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/officer">Officer</Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">CWSK</Link>
                </Button>
              )}
            </>
          )}
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            {t("nav.privacy")}
          </Link>
          <LangSwitch />
          {!authed && (
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
