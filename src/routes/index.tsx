import "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/SiteHeader";
import { ShieldCheck, Users, Eye } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tafuta Mtoto — AI-assisted missing child reunification (Kenya)" },
      {
        name: "description",
        content:
          "Secure, human-verified platform for parents, police, schools and shelters to safely locate missing children in Kenya.",
      },
      { property: "og:title", content: "Tafuta Mtoto" },
      {
        property: "og:description",
        content: "AI-assisted, human-verified missing child reunification — built with Kenyan data protection at its core.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Kenya Data Protection Act 2019 · Human-in-the-loop AI
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("landing.title")}</h1>
            <p className="mt-4 text-muted-foreground md:text-lg">{t("landing.subtitle")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/signup">{t("landing.cta")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">{t("landing.secondary")}</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-destructive">{t("landing.emergency")}</p>
          </div>
        </section>

        <section className="border-t bg-secondary/30">
          <div className="container mx-auto px-4 py-12">
            <h2 className="mb-8 text-center text-2xl font-semibold">{t("landing.howTitle")}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Users, t: "landing.how1Title", b: "landing.how1" },
                { icon: Eye, t: "landing.how2Title", b: "landing.how2" },
                { icon: ShieldCheck, t: "landing.how3Title", b: "landing.how3" },
              ].map(({ icon: Icon, t: title, b }) => (
                <Card key={title}>
                  <CardHeader>
                    <Icon className="mb-2 h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t(title)}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{t(b)}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-3xl rounded-lg border p-6">
            <h3 className="font-semibold">{t("landing.ethicsTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.ethics")}</p>
            <Link to="/privacy" className="mt-3 inline-block text-sm text-primary underline">
              {t("nav.privacy")} →
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tafuta Mtoto · For demonstration purposes
      </footer>
    </div>
  );
}
