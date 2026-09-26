import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff, MailCheck, RefreshCw, CheckCircle2, Database } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { signIn, signUp, resetPassword, signInWithGoogle } from "../lib/auth";
import { useApp } from "../context/AppContext";
import { authTarget } from "../lib/firebase";
import { toast } from "sonner";
import { getTranslations } from "../lib/i18n";
const getFirebaseErrorMessage = (error, t) => {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': t.errEmailInUse,
    'auth/invalid-email': t.errInvalidEmail,
    'auth/wrong-password': t.errWrongPassword,
    'auth/user-not-found': t.errUserNotFound,
    'auth/weak-password': t.errWeakPassword,
    'auth/too-many-requests': t.errTooManyRequests,
    'auth/network-request-failed': t.errNetwork.replace('{target}', authTarget),
    'auth/invalid-credential': t.errInvalidCredential,
    'auth/email-not-verified': t.errEmailNotVerified,
  };
  return messages[code] || error?.message || t.errorOccurred;
};

function GoogleMark() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 6.6-9.6 6.6-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function LoginPage({ onBack, onSwitchToSignup, onForgotPassword, onSuccess, language = "de" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = getTranslations(language);

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle(language);
      if (user) onSuccess?.();
    } catch (error) {
      const abgebrochen = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];
      if (!abgebrochen.includes(error.code)) toast.error(t.googleFailed);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.fillAllFields);
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
      toast.error(getFirebaseErrorMessage(error, t));
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
          <span className="text-sm">{t.back}</span>
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
            <h1 className="font-heading text-2xl font-bold text-foreground">{t.login}</h1>
            <p className="text-muted-foreground mt-1">{t.loginSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="h-12 pl-10"
                  autoComplete="email"
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
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
              {t.forgotPasswordQuestion}
            </button>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t.login}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t.orSeparator}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            data-testid="google-auth-btn"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GoogleMark />}
            {t.googleSignIn}
          </Button>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {t.dontHaveAccount}{" "}
            <button
              onClick={onSwitchToSignup}
              className="text-primary hover:underline font-medium"
              data-testid="switch-to-signup"
            >
              {t.signupNow}
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const t = getTranslations(language);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle(language);
      if (user) onSuccess?.();
    } catch (error) {
      const abgebrochen = ["auth/popup-closed-by-user", "auth/cancelled-popup-request"];
      if (!abgebrochen.includes(error.code)) toast.error(t.googleFailed);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.fillAllFields);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t.passwordsDontMatch);
      return;
    }
    if (password.length < 6) {
      toast.error(t.passwordTooShort);
      return;
    }
    if (!acceptedTerms) {
      toast.error(t.pleaseAcceptTerms);
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim() || email.trim().split("@")[0], language);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error, t));
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
          <span className="text-sm">{t.back}</span>
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
            <h1 className="font-heading text-2xl font-bold text-foreground">{t.createAccount}</h1>
            <p className="text-muted-foreground mt-1">{t.signupSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t.nameLabel} <span className="text-muted-foreground font-normal">({t.optional})</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="h-12 pl-10"
                  data-testid="signup-name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="h-12 pl-10"
                  autoComplete="email"
                  data-testid="signup-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordMinPlaceholder}
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
              <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.repeatPassword}
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
              {t.createAccount}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t.orSeparator}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            data-testid="google-auth-btn"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GoogleMark />}
            {t.googleSignUp}
          </Button>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            {t.alreadyHaveAccount}{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
              data-testid="switch-to-login"
            >
              {t.login}
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
  const t = getTranslations(language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t.enterEmail);
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), language);
      setSent(true);
      toast.success(t.resetEmailSent);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error, t));
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
          <span className="text-sm">{t.back}</span>
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
            <h1 className="font-heading text-2xl font-bold text-foreground">{t.resetPasswordTitle}</h1>
            <p className="text-muted-foreground mt-1">
              {sent
                ? t.resetPasswordSentText
                : t.resetPasswordPrompt}
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="h-12 pl-10"
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading} data-testid="forgot-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t.sendResetLink}
              </Button>
            </form>
          ) : (
            <Button onClick={onBack} variant="outline" className="w-full h-12" data-testid="back-to-login-btn">
              {t.backToLogin}
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
      toast.error(getFirebaseErrorMessage(error, t));
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const verified = await checkVerificationNow();
      if (verified) toast.success(t.verifiedSuccess);
      else toast.error(t.stillNotVerified);
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error, t));
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
          <span className="text-sm">{t.back}</span>
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
