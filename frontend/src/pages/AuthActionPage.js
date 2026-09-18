import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { getTranslations } from "../lib/i18n";
import { applyEmailActionCode, verifyResetCode, confirmReset } from "../lib/auth";

const LOCAL = {
  de: {
    verifying: "Wird bestätigt…",
    verifiedRedirect: "E-Mail bestätigt! Du wirst weitergeleitet…",
    goToApp: "Zur App",
    setNewPassword: "Neues Passwort festlegen",
    setPasswordFor: "Lege ein neues Passwort für {email} fest.",
    save: "Passwort speichern",
    goToLogin: "Zur Anmeldung",
    invalidLink: "Dieser Link ist ungültig oder abgelaufen.",
    passwordsNoMatch: "Passwörter stimmen nicht überein.",
    passwordTooShort: "Passwort muss mindestens 6 Zeichen haben.",
    emailRestored: "E-Mail-Adresse wiederhergestellt.",
  },
  en: {
    verifying: "Verifying…",
    verifiedRedirect: "Email verified! Redirecting…",
    goToApp: "Go to app",
    setNewPassword: "Set a new password",
    setPasswordFor: "Set a new password for {email}.",
    save: "Save password",
    goToLogin: "Go to login",
    invalidLink: "This link is invalid or has expired.",
    passwordsNoMatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 6 characters.",
    emailRestored: "Email address restored.",
  },
  es: {
    verifying: "Verificando…",
    verifiedRedirect: "¡Correo verificado! Redirigiendo…",
    goToApp: "Ir a la app",
    setNewPassword: "Establecer una nueva contraseña",
    setPasswordFor: "Establece una nueva contraseña para {email}.",
    save: "Guardar contraseña",
    goToLogin: "Ir a iniciar sesión",
    invalidLink: "Este enlace no es válido o ha caducado.",
    passwordsNoMatch: "Las contraseñas no coinciden.",
    passwordTooShort: "La contraseña debe tener al menos 6 caracteres.",
    emailRestored: "Dirección de correo restaurada.",
  },
  fr: {
    verifying: "Vérification…",
    verifiedRedirect: "E-mail vérifié ! Redirection…",
    goToApp: "Aller à l'application",
    setNewPassword: "Définir un nouveau mot de passe",
    setPasswordFor: "Définis un nouveau mot de passe pour {email}.",
    save: "Enregistrer le mot de passe",
    goToLogin: "Aller à la connexion",
    invalidLink: "Ce lien est invalide ou a expiré.",
    passwordsNoMatch: "Les mots de passe ne correspondent pas.",
    passwordTooShort: "Le mot de passe doit comporter au moins 6 caractères.",
    emailRestored: "Adresse e-mail restaurée.",
  },
  it: {
    verifying: "Verifica in corso…",
    verifiedRedirect: "E-mail verificata! Reindirizzamento…",
    goToApp: "Vai all'app",
    setNewPassword: "Imposta una nuova password",
    setPasswordFor: "Imposta una nuova password per {email}.",
    save: "Salva password",
    goToLogin: "Vai al login",
    invalidLink: "Questo link non è valido o è scaduto.",
    passwordsNoMatch: "Le password non corrispondono.",
    passwordTooShort: "La password deve contenere almeno 6 caratteri.",
    emailRestored: "Indirizzo e-mail ripristinato.",
  },
};

const Shell = ({ children }) => (
  <div className="min-h-screen bg-background flex flex-col" data-testid="auth-action-page">
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="flex items-center justify-center mb-8">
          <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-11 dark:hidden" />
          <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="h-11 hidden dark:block" />
        </div>
        {children}
      </motion.div>
    </main>
  </div>
);

export function AuthActionPage({ language = "de", navigate }) {
  const t = getTranslations(language);
  const s = LOCAL[language] || LOCAL.de;

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  const [status, setStatus] = useState("working");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goApp = useCallback(() => navigate("/app", { replace: true }), [navigate]);
  const goLogin = useCallback(() => navigate("/login", { replace: true }), [navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!oobCode) {
        setStatus("error");
        return;
      }
      try {
        if (mode === "resetPassword") {
          const email = await verifyResetCode(oobCode);
          if (cancelled) return;
          setResetEmail(email);
          setStatus("reset");
        } else if (
          mode === "verifyEmail" ||
          mode === "verifyAndChangeEmail" ||
          mode === "recoverEmail"
        ) {
          await applyEmailActionCode(oobCode);
          if (cancelled) return;
          setStatus("verified");
        } else {
          setStatus("error");
        }
      } catch (error) {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [mode, oobCode]);

  useEffect(() => {
    if (status !== "verified") return;
    const target = mode === "recoverEmail" ? goLogin : goApp;
    const id = setTimeout(target, 1600);
    return () => clearTimeout(id);
  }, [status, mode, goApp, goLogin]);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(s.passwordsNoMatch);
      return;
    }
    if (newPassword.length < 6) {
      toast.error(s.passwordTooShort);
      return;
    }
    setSubmitting(true);
    try {
      await confirmReset(oobCode, newPassword);
      toast.success(t.passwordChanged);
      goLogin();
    } catch (error) {
      toast.error(error?.message || s.invalidLink);
      setSubmitting(false);
    }
  };

  if (status === "working") {
    return (
      <Shell>
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        <p className="text-muted-foreground">{s.verifying}</p>
      </Shell>
    );
  }

  if (status === "verified") {
    return (
      <Shell>
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">{t.verifiedSuccess}</h1>
        <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {mode === "recoverEmail" ? s.emailRestored : s.verifiedRedirect}
        </p>
        <Button
          onClick={mode === "recoverEmail" ? goLogin : goApp}
          className="w-full h-12 text-base mt-8"
          data-testid="action-continue-btn"
        >
          {mode === "recoverEmail" ? s.goToLogin : s.goToApp}
        </Button>
      </Shell>
    );
  }

  if (status === "reset") {
    return (
      <Shell>
        <h1 className="font-heading text-2xl font-bold text-foreground">{s.setNewPassword}</h1>
        <p className="text-muted-foreground mt-2">{s.setPasswordFor.replace("{email}", resetEmail)}</p>
        <form onSubmit={handleResetSubmit} className="space-y-4 mt-8 text-left">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t.newPassword}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 pl-10 pr-10"
                autoComplete="new-password"
                data-testid="action-new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pl-10"
                autoComplete="new-password"
                data-testid="action-confirm-password"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={submitting} data-testid="action-reset-submit">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {s.save}
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
      </div>
      <p className="text-muted-foreground">{s.invalidLink}</p>
      <Button onClick={goLogin} variant="outline" className="w-full h-12 mt-8" data-testid="action-error-login">
        {s.goToLogin}
      </Button>
    </Shell>
  );
}

export default AuthActionPage;
