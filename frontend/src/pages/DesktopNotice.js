import React from "react";
import { Smartphone } from "lucide-react";
import { getTranslations } from "../lib/i18n";

export default function DesktopNotice({ language }) {
  const t = getTranslations(language);
  const host = typeof window !== "undefined" ? window.location.host : "";

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-6 text-center">
      <div className="max-w-sm flex flex-col items-center">
        <div className="relative">
          <img
            src={`${process.env.PUBLIC_URL || ""}/kakeibo-icon.png`}
            alt="Kakeibo"
            className="w-20 h-20 rounded-[1.5rem] shadow-lg"
          />
          <span className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Smartphone className="w-5 h-5" />
          </span>
        </div>

        <h1 className="mt-8 text-2xl font-heading font-semibold text-foreground">
          {t.desktopOnlyTitle}
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          {t.desktopOnlyText}
        </p>

        {host && (
          <div className="mt-7 px-4 py-2 rounded-full bg-muted text-sm text-muted-foreground">
            {host}
          </div>
        )}
      </div>
    </div>
  );
}
