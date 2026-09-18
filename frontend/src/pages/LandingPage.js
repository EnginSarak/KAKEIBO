import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PieChart,
  Tag,
  LayoutDashboard,
  Globe,
  ArrowRight,
  Wallet,
  PiggyBank,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { cn } from "../lib/utils";
import { formatCurrency } from "../lib/currency";
import { getLandingTranslations } from "../lib/landing-i18n";
import { languageNames, getTranslations } from "../lib/i18n";
import { useApp } from "../context/AppContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { BudgetCard } from "../components/BudgetCard";
import { TransactionItem } from "../components/TransactionItem";
import CookieBanner from "../components/CookieBanner";

const gridTexture = {
  backgroundImage:
    "linear-gradient(to right, var(--kbo-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--kbo-grid) 1px, transparent 1px)",
  backgroundSize: "72px 72px",
  maskImage: "radial-gradient(ellipse 75% 60% at 50% 0%, #000 35%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 75% 60% at 50% 0%, #000 35%, transparent 100%)",
};

const heroGlow = {
  background: "radial-gradient(ellipse 62% 48% at 50% -5%, var(--kbo-glow), transparent 70%)",
};

const mintWash = {
  background: "radial-gradient(circle at 25% 15%, var(--kbo-glow), transparent 60%)",
};

const spring = { type: "spring", stiffness: 220, damping: 26 };

function PillButton({ children, onClick, variant = "primary", className, testId }) {
  const styles =
    variant === "primary"
      ? "bg-kbo-accent text-kbo-accent-fg hover:opacity-90"
      : "border border-kbo-line text-kbo-text hover:border-kbo-accent/50 hover:bg-kbo-accent/5";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      data-testid={testId}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kbo-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-kbo-bg",
        styles,
        className
      )}
    >
      {children}
    </motion.button>
  );
}

function Panel({ title, children, className }) {
  return (
    <div className={cn("rounded-2xl border border-kbo-line bg-background p-4 sm:p-5", className)}>
      {title && <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">{title}</h3>}
      {children}
    </div>
  );
}

function AppShowcase({ t, app, currency, reduce }) {
  const expenseBudgets = [
    { id: "sw1", name: t.exampleBudget1, amount: 450, spent: 138, carried_over: 0, color: "#0d5c43" },
    { id: "sw2", name: t.exampleBudget2, amount: 200, spent: 42, carried_over: 0, color: "#0f7a58" },
    { id: "sw3", name: t.exampleBudget4, amount: 180, spent: 63, carried_over: 0, color: "#12a074" },
  ];
  const savingBudgets = [
    { id: "sv1", name: t.exampleBudget3, amount: 1200, spent: 0, carried_over: 340, color: "#1fc38d" },
  ];
  const transactions = [
    { id: "tx1", name: t.exampleTx1, amount: 62.4, transaction_type: "expense", budget_id: null, date: "2026-07-24" },
    { id: "tx2", name: t.exampleTx2, amount: 48, transaction_type: "expense", budget_id: null, date: "2026-07-23" },
    { id: "tx3", name: t.exampleTx3, amount: 24, transaction_type: "expense", budget_id: null, date: "2026-07-22" },
    { id: "tx4", name: t.exampleTx4, amount: 2400, transaction_type: "income", budget_id: null, date: "2026-07-01" },
  ];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.04 }}
      transition={{ ...spring, damping: 30 }}
      className="relative mx-auto w-full max-w-[1180px]"
    >
      <div className="absolute -inset-4 rounded-[3rem]" style={mintWash} aria-hidden="true" />
      <div className="pointer-events-none relative select-none rounded-3xl border border-kbo-line bg-kbo-panel/60 p-3 backdrop-blur-sm sm:p-4">
        <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
          <div className="space-y-3 lg:col-span-7">
            <Panel>
              <div className="rounded-2xl bg-gradient-to-br from-[#0d5c43] to-[#0f7a58] p-5">
                <p className="text-xs font-medium text-white/80">{app.totalBalance}</p>
                <p className="mt-1 font-heading text-3xl font-bold tabular-nums text-white sm:text-4xl">
                  <AnimatedNumber value={2450} format={(v) => formatCurrency(v, currency)} duration={900} />
                </p>
              </div>
              <h3 className="mb-2 mt-5 font-heading text-sm font-semibold text-foreground">{app.expenseBudgets}</h3>
              <div className="space-y-2">
                {expenseBudgets.map((budget) => (
                  <BudgetCard key={budget.id} budget={budget} />
                ))}
              </div>
              <h3 className="mb-2 mt-5 font-heading text-sm font-semibold text-foreground">{app.accumulatingBudgets}</h3>
              <div className="space-y-2">
                {savingBudgets.map((budget) => (
                  <BudgetCard key={budget.id} budget={budget} />
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-3 lg:col-span-5">
            <Panel title={app.recentTransactions}>
              <div className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} showBudget={false} />
                ))}
              </div>
            </Panel>
            <Panel title={app.pendingRemainder}>
              <p className="font-heading text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(45, currency)}
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { name: t.exampleBudget3, value: 30 },
                  { name: t.exampleBudget2, value: 15 },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <span className="text-sm text-foreground">{row.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(row.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {app.redistribute}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuestionList({ t, reduce }) {
  const rows = [
    { icon: Wallet, question: t.question1, answer: t.answer1 },
    { icon: PiggyBank, question: t.question2, answer: t.answer2 },
    { icon: Receipt, question: t.question3, answer: t.answer3 },
    { icon: TrendingUp, question: t.question4, answer: t.answer4 },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-28">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-kbo-text sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {t.questionsTitle}
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-kbo-muted">{t.questionsSubtitle}</p>
        </div>
      </div>

      <div className="lg:col-span-7">
        {rows.map(({ icon: Icon, question, answer }, index) => (
          <motion.div
            key={question}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ ...spring, delay: index * 0.05 }}
            className={cn("flex gap-5 py-7", index > 0 && "border-t border-kbo-line")}
          >
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-kbo-accent/20 bg-kbo-accent/10">
              <Icon className="h-[18px] w-[18px] text-kbo-accent-soft" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-kbo-text sm:text-2xl">{question}</h3>
              <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-kbo-muted">{answer}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RemainderMoment({ t, app, currency, reduce }) {
  const leftoverBudget = {
    id: "rm1",
    name: t.exampleBudget1,
    amount: 450,
    spent: 405,
    carried_over: 0,
    pending_remainder: 45,
    color: "#0d5c43",
  };

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div>
        <h2 className="font-heading text-3xl font-bold tracking-tight text-kbo-text sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          {t.remainderTitle}
        </h2>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-kbo-muted sm:text-lg">{t.remainderBody}</p>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 24 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={spring}
        className="relative"
      >
        <div className="absolute -inset-6 rounded-[2.5rem]" style={mintWash} aria-hidden="true" />
        <div className="pointer-events-none relative select-none rounded-3xl border border-kbo-line bg-kbo-panel/60 p-3">
          <div className="rounded-2xl bg-background p-4 sm:p-5">
            <BudgetCard budget={leftoverBudget} />
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{app.pendingRemainder}</p>
              <p className="mt-0.5 font-heading text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(45, currency)}
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { name: t.exampleBudget3, value: 30 },
                  { name: t.exampleBudget2, value: 15 },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                    <span className="text-sm text-foreground">{row.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-success">
                      +{formatCurrency(row.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {app.redistribute}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCell({ icon: Icon, title, description, index, span, tint, reduce }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring, delay: index * 0.06 }}
      className={cn("relative overflow-hidden rounded-2xl border border-kbo-line bg-kbo-panel p-6 sm:p-8", span)}
    >
      {tint && <div className="absolute inset-0" style={tint} aria-hidden="true" />}
      <div className="relative">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-kbo-accent/20 bg-kbo-accent/10">
          <Icon className="h-5 w-5 text-kbo-accent-soft" strokeWidth={2} />
        </div>
        <h3 className="font-heading text-lg font-semibold text-kbo-text">{title}</h3>
        <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-kbo-muted">{description}</p>
      </div>
    </motion.div>
  );
}

export function LandingPage({ onStartDemo, onLogin, onSignup, language, onChangeLanguage }) {
  const t = getLandingTranslations(language);
  const app = getTranslations(language);
  const { settings } = useApp();
  const reduce = useReducedMotion();
  const currency = settings.currency;

  const features = [
    { icon: PieChart, title: t.feature1Title, description: t.feature1Desc, span: "sm:col-span-4", tint: mintWash },
    { icon: Tag, title: t.feature2Title, description: t.feature2Desc, span: "sm:col-span-2", tint: null },
    { icon: LayoutDashboard, title: t.feature3Title, description: t.feature3Desc, span: "sm:col-span-2", tint: null },
    {
      icon: Globe,
      title: t.feature4Title,
      description: t.feature4Desc,
      span: "sm:col-span-4",
      tint: { ...gridTexture, maskImage: "none", WebkitMaskImage: "none", opacity: 0.6 },
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-clip bg-kbo-bg font-body text-kbo-text"
      data-testid="landing-page"
    >
      <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-full border border-kbo-line bg-kbo-panel/70 pl-4 pr-2 backdrop-blur-xl sm:gap-4 sm:px-6">
          <div className="flex-shrink-0">
            <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-6 dark:hidden sm:h-7" />
            <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="hidden h-6 dark:block sm:h-7" />
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2.5">
            <ThemeToggle className="flex-shrink-0" />
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full px-1.5 py-2 text-[13px] font-medium text-kbo-muted transition-colors hover:text-kbo-text sm:px-3 sm:text-sm"
              data-testid="login-btn-header"
            >
              {t.loginBtn}
            </button>
            <PillButton onClick={onSignup} className="px-3 py-2 text-[13px] sm:px-4 sm:text-sm" testId="register-btn-header">
              {t.ctaStart}
            </PillButton>
          </div>
        </nav>
      </header>

      <section className="relative flex min-h-[56vh] flex-col items-center justify-center overflow-hidden px-4 pb-10 pt-28">
        <div className="absolute inset-0" style={gridTexture} aria-hidden="true" />
        <div className="absolute inset-0" style={heroGlow} aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="font-heading text-[2.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            <span className="block text-kbo-text">{t.heroTitleA}</span>
            <span className="block bg-gradient-to-r from-kbo-text to-kbo-accent bg-clip-text pb-2 text-transparent">
              {t.heroTitleB}
            </span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-kbo-muted sm:text-lg"
          >
            {t.heroSubtitle}
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <PillButton onClick={onSignup} className="w-full px-7 py-3.5 text-base sm:w-auto" testId="signup-btn-hero">
              {t.ctaStart}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </PillButton>
            <PillButton
              onClick={onStartDemo}
              variant="secondary"
              className="w-full px-7 py-3.5 text-base sm:w-auto"
              testId="start-demo-btn"
            >
              {t.startDemo}
            </PillButton>
          </motion.div>
        </div>
      </section>

      <section className="relative px-4 pb-20 pt-6 sm:pb-28">
        <AppShowcase t={t} app={app} currency={currency} reduce={reduce} />
      </section>

      <section className="px-4 py-16 sm:py-28">
        <QuestionList t={t} reduce={reduce} />
      </section>

      <section className="px-4 py-16 sm:py-28">
        <RemainderMoment t={t} app={app} currency={currency} reduce={reduce} />
      </section>

      <section className="px-4 py-16 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-center text-3xl font-bold tracking-tight text-kbo-text sm:text-4xl">
            {t.featuresTitle}
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCell key={feature.title} {...feature} index={index} reduce={reduce} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-28 sm:pb-36">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={spring}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-kbo-line bg-kbo-panel px-6 py-16 text-center sm:px-12 sm:py-20"
        >
          <div className="absolute inset-0" style={heroGlow} aria-hidden="true" />
          <div className="relative">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-kbo-text sm:text-4xl">{t.finalCtaTitle}</h2>
            <p className="mx-auto mt-4 max-w-md text-base text-kbo-muted">{t.finalCtaSubtitle}</p>
            <PillButton onClick={onSignup} className="mt-8 px-7 py-3.5 text-base" testId="signup-btn-footer">
              {t.ctaStart}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </PillButton>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-kbo-line px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <>
              <img src="/kakeibo-logo-light.svg" alt="Kakeibo" className="h-7 dark:hidden" />
              <img src="/kakeibo-logo-dark.svg" alt="Kakeibo" className="hidden h-7 dark:block" />
            </>
            <p className="mt-4 text-sm text-kbo-muted">{t.copyright}</p>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold text-kbo-text">Legal</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="/imprint" className="text-kbo-muted transition-colors hover:text-kbo-text">{t.imprint}</a></li>
              <li><a href="/privacy" className="text-kbo-muted transition-colors hover:text-kbo-text">{t.privacy}</a></li>
              <li><a href="/terms" className="text-kbo-muted transition-colors hover:text-kbo-text">{t.terms}</a></li>
              <li><a href="/contact" className="text-kbo-muted transition-colors hover:text-kbo-text">{t.contact}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold text-kbo-text">Cookies</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="/cookie-statement" className="text-kbo-muted transition-colors hover:text-kbo-text">
                  {t.cookieStatement}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => localStorage.removeItem("kakeibo_cookie_consent")}
                  className="text-kbo-muted transition-colors hover:text-kbo-text"
                >
                  {t.cookieSettings}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold text-kbo-text">{t.language}</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(languageNames).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeLanguage(code)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    language === code
                      ? "border-kbo-accent/40 bg-kbo-accent/10 text-kbo-accent-soft"
                      : "border-kbo-line text-kbo-muted hover:border-kbo-accent/40 hover:text-kbo-text"
                  )}
                  data-testid={`footer-lang-${code}`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <CookieBanner language={language} />
    </div>
  );
}

export default LandingPage;
