import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff, MailCheck, RefreshCw, CheckCircle2, Database } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { signIn, signUp, resetPassword } from "../lib/auth";
import { useApp } from "../context/AppContext";
import { authTarget } from "../lib/firebase";
import { toast } from "sonner";
import { getTranslations } from "../lib/i18n";
const getFirebaseErrorMessage = (error) => {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
    'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
    'auth/wrong-password': 'Falsches Passwort.',
    'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
    'auth/weak-password': 'Passwort muss mindestens 6 Zeichen haben.',
    'auth/too-many-requests': 'Zu viele Versuche. Bitte warte kurz.',
    'auth/network-request-failed': `Netzwerkfehler: Server nicht erreichbar (${authTarget}).`,
    'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
    'auth/email-not-verified': 'Bitte bestätige zuerst deine E-Mail-Adresse. Schau in deinen Posteingang.',
  };
  return messages[code] || error?.message || 'Ein Fehler ist aufgetreten.';
};

export function LoginPage({ onBack, onSwitchToSignup, onForgotPassword, onSuccess, language = "de" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = getTranslations(language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      if (user.emailVerified) {
        onSuccess?.();
      } else {
        toast.error(t.verifyEmailFirst);
      }
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="login-page">
      <header className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Zurück</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-8">
            <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-11 dark:hidden" />
            <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="h-11 hidden dark:block" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground">Anmelden</h1>
            <p className="text-muted-foreground mt-1">Willkommen zurück!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="h-12 pl-10"
                  autoComplete="email"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-10 pr-10"
                  autoComplete="current-password"
                  data-testid="login-password-input"
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

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:underline"
              data-testid="forgot-password-link"
            >
              Passwort vergessen?
            </button>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Anmelden
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <button
              onClick={onSwitchToSignup}
              className="text-primary hover:underline font-medium"
              data-testid="switch-to-signup"
            >
              Jetzt registrieren
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export function SignupPage({ onBack, onSwitchToLogin, onSuccess, language = "de" }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const t = getTranslations(language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 6) {
      toast.error("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (!acceptedTerms) {
      toast.error(t.pleaseAcceptTerms);
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim() || email.trim().split("@")[0]);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="signup-page">
      <header className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Zurück</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-8">
            <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-11 dark:hidden" />
            <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="h-11 hidden dark:block" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground">Konto erstellen</h1>
            <p className="text-muted-foreground mt-1">Starte dein persönliches Budget-Tracking</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Wird aus deiner E-Mail übernommen"
                  className="h-12 pl-10"
                  data-testid="signup-name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="h-12 pl-10"
                  autoComplete="email"
                  data-testid="signup-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  className="h-12 pl-10 pr-10"
                  autoComplete="new-password"
                  data-testid="signup-password-input"
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
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="h-12 pl-10"
                  autoComplete="new-password"
                  data-testid="signup-confirm-password-input"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={setAcceptedTerms}
                className="mt-0.5"
                data-testid="terms-checkbox"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                {t.agreeToTerms}{" "}
                <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t.termsAndConditions}
                </a>{" "}
                {t.and}{" "}
                <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t.privacyPolicy}
                </a>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || !acceptedTerms}
              data-testid="signup-submit-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Konto erstellen
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Bereits ein Konto?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
              data-testid="switch-to-login"
            >
              Anmelden
            </button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export function ForgotPasswordPage({ onBack, language = "de" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Bitte E-Mail-Adresse eingeben.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
      toast.success("Passwort-Reset-E-Mail gesendet!");
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="forgot-password-page">
      <header className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Zurück</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-8">
            <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-11 dark:hidden" />
            <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="h-11 hidden dark:block" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground">Passwort zurücksetzen</h1>
            <p className="text-muted-foreground mt-1">
              {sent
                ? "Wir haben dir eine E-Mail mit einem Reset-Link gesendet."
                : "Gib deine E-Mail-Adresse ein."}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className="h-12 pl-10"
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading} data-testid="forgot-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Reset-Link senden
              </Button>
            </form>
          ) : (
            <Button onClick={onBack} variant="outline" className="w-full h-12" data-testid="back-to-login-btn">
              Zurück zur Anmeldung
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export function VerifyEmailPage({ language = "de" }) {
  const t = getTranslations(language);
  const { pendingVerificationEmail, resendVerification, checkVerificationNow, logout } = useApp();
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerification();
      setCooldown(30);
      toast.success(t.resendEmailDone);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const verified = await checkVerificationNow();
      if (verified) toast.success(t.verifiedSuccess);
      else toast.error(t.stillNotVerified);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="verify-email-page">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-foreground">{t.verifyEmailTitle}</h1>
          <p className="text-muted-foreground mt-2">
            {t.verifyEmailSubtitle.replace("{email}", pendingVerificationEmail || "")}
          </p>
          <p className="text-sm text-muted-foreground mt-4">{t.verifyEmailHint}</p>

          <div className="mt-8 space-y-3">
            <Button
              onClick={handleCheck}
              className="w-full h-12 text-base"
              disabled={checking}
              data-testid="check-verification-btn"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {checking ? t.checkingVerification : t.iHaveVerified}
            </Button>
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full h-12"
              disabled={cooldown > 0}
              data-testid="resend-verification-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {cooldown > 0 ? t.resendEmailIn.replace("{seconds}", String(cooldown)) : t.resendEmail}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">{t.verifyEmailSpam}</p>
          <button
            onClick={logout}
            className="text-sm text-primary hover:underline mt-6"
            data-testid="verify-logout-btn"
          >
            {t.wrongEmailLogout}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export function FirebaseSetupNotice({ onBack, onTryDemo, language = "de" }) {
  const t = getTranslations(language);
  const steps = [t.setupStep1, t.setupStep2, t.setupStep3];

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="firebase-setup-notice">
      <header className="p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Zurück</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Database className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-foreground text-center">{t.setupTitle}</h1>
          <p className="text-muted-foreground mt-3 text-center">{t.setupBody}</p>

          <ol className="mt-6 space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-muted-foreground mt-6 text-center">{t.setupGuideHint}</p>

          {onTryDemo && (
            <Button
              onClick={onTryDemo}
              variant="outline"
              className="w-full h-12 mt-6"
              data-testid="setup-try-demo-btn"
            >
              {t.setupTryDemo}
            </Button>
          )}
        </motion.div>
      </main>
    </div>
  );
}
