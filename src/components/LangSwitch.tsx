import "@/i18n";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LangSwitch() {
  const { i18n } = useTranslation();
  const next = i18n.language?.startsWith("sw") ? "en" : "sw";
  return (
    <Button variant="ghost" size="sm" onClick={() => i18n.changeLanguage(next)}>
      {next === "sw" ? "Kiswahili" : "English"}
    </Button>
  );
}
