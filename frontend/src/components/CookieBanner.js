import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const COOKIE_KEY = "kakeibo_cookie_consent";

export function CookieBanner({ language = "de" }) {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const t = {
    de: {
      title: "Cookie-Einstellungen",
      desc: "Wir verwenden Cookies, um dein Erlebnis zu verbessern und unsere Dienste zu analysieren.",
      acceptAll: "Alle akzeptieren",
      necessaryOnly: "Nur notwendige",
      settings: "Einstellungen",
      save: "Speichern",
      necessary: "Notwendige Cookies",
      necessaryDesc: "Diese Cookies sind für die Grundfunktionen erforderlich.",
      analytics: "Analyse-Cookies",
      analyticsDesc: "Helfen uns zu verstehen, wie du unsere Seite nutzt.",
      marketing: "Marketing-Cookies",
      marketingDesc: "Werden für personalisierte Werbung verwendet.",
    },
    en: {
      title: "Cookie Settings",
      desc: "We use cookies to improve your experience and analyze our services.",
      acceptAll: "Accept all",
      necessaryOnly: "Necessary only",
      settings: "Settings",
      save: "Save",
      necessary: "Necessary Cookies",
      necessaryDesc: "These cookies are required for basic functions.",
      analytics: "Analytics Cookies",
      analyticsDesc: "Help us understand how you use our site.",
      marketing: "Marketing Cookies",
      marketingDesc: "Used for personalized advertising.",
    },
  }[language] || {
    title: "Cookie Settings",
    desc: "We use cookies to improve your experience.",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    settings: "Settings",
    save: "Save",
    necessary: "Necessary",
    necessaryDesc: "Required for basic functions.",
    analytics: "Analytics",
    analyticsDesc: "Usage analysis.",
    marketing: "Marketing",
    marketingDesc: "Personalized ads.",
  };

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = { necessary: true, analytics: true, marketing: true, timestamp: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  const handleNecessaryOnly = () => {
    const consent = { necessary: true, analytics: false, marketing: false, timestamp: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  const handleSavePreferences = () => {
    const consent = { ...preferences, timestamp: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setVisible(false);
    setShowSettings(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        data-testid="cookie-banner"
      >
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {!showSettings ? (
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Cookie className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-foreground">{t.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleAcceptAll} className="flex-1 sm:flex-none" data-testid="cookie-accept-all">
                    {t.acceptAll}
                  </Button>
                  <Button variant="outline" onClick={handleNecessaryOnly} className="flex-1 sm:flex-none" data-testid="cookie-necessary-only">
                    {t.necessaryOnly}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSettings(true)} className="flex-1 sm:flex-none" data-testid="cookie-settings">
                    <Settings className="w-4 h-4 mr-2" />
                    {t.settings}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-foreground">{t.settings}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.necessary}</p>
                      <p className="text-xs text-muted-foreground">{t.necessaryDesc}</p>
                    </div>
                    <div className="w-10 h-6 bg-primary rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.analytics}</p>
                      <p className="text-xs text-muted-foreground">{t.analyticsDesc}</p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className={cn(
                        "w-10 h-6 rounded-full flex items-center px-1 transition-colors",
                        preferences.analytics ? "bg-primary justify-end" : "bg-border justify-start"
                      )}
                    >
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </button>
                  </label>
                  <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground text-sm">{t.marketing}</p>
                      <p className="text-xs text-muted-foreground">{t.marketingDesc}</p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className={cn(
                        "w-10 h-6 rounded-full flex items-center px-1 transition-colors",
                        preferences.marketing ? "bg-primary justify-end" : "bg-border justify-start"
                      )}
                    >
                      <div className="w-4 h-4 bg-white rounded-full" />
                    </button>
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={handleSavePreferences} className="flex-1" data-testid="cookie-save">
                    {t.save}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CookieBanner;
