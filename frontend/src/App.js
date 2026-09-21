import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import { LoginPage, SignupPage, ForgotPasswordPage, VerifyEmailPage, FirebaseSetupNotice } from './pages/AuthPages';
import { AuthActionPage } from './pages/AuthActionPage';
import ContactPage from './pages/ContactPage';
import { ImprintPage, PrivacyPage, TermsPage, CookieStatementPage } from './pages/LegalPages';
import DesktopNotice from './pages/DesktopNotice';

const SETTINGS_KEY = 'kakeibo_settings';
const NOINDEX_PATHS = ['/imprint', '/privacy'];

function useIsDesktop() {
  const query = '(hover: hover) and (pointer: fine)';
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setIsDesktop(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isDesktop;
}

const detectLanguage = () => {
  try {
    const settings = localStorage.getItem(SETTINGS_KEY);
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) return parsed.language;
    }
  } catch {}
  const supported = ['de', 'en', 'es', 'fr', 'it'];
  const browserLang = (navigator.language || 'de').slice(0, 2).toLowerCase();
  return supported.includes(browserLang) ? browserLang : 'de';
};
function MainAppContent({ onExitDemo }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBudgetId, setSelectedBudgetId] = useState(null);
  const [budgetOrigin, setBudgetOrigin] = useState('dashboard');
  const reduce = useReducedMotion();

  const handleNavigateToBudgetTransactions = (budgetId, origin = 'dashboard') => {
    setSelectedBudgetId(budgetId);
    setBudgetOrigin(origin);
    setCurrentPage('budgetTransactions');
  };

  const renderBase = () => {
    switch (currentPage) {
      case 'transactions':
        return (
          <TransactionsPage
            onBack={() => setCurrentPage('dashboard')}
            onSelectBudget={(id) => handleNavigateToBudgetTransactions(id, 'transactions')}
          />
        );
      case 'budgetTransactions':
        return (
          <TransactionsPage
            onBack={() => { setSelectedBudgetId(null); setCurrentPage(budgetOrigin); }}
            budgetId={selectedBudgetId}
          />
        );
      default:
        return (
          <Dashboard
            onNavigateToSettings={() => setCurrentPage('settings')}
            onNavigateToTransactions={() => setCurrentPage('transactions')}
            onNavigateToBudgetTransactions={handleNavigateToBudgetTransactions}
          />
        );
    }
  };

  return (
    <>
      {renderBase()}
      <AnimatePresence>
        {currentPage === 'settings' && (
          <motion.div
            key="settings"
            initial={reduce ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-background"
          >
            <SettingsPage onBack={() => setCurrentPage('dashboard')} onExitDemo={onExitDemo} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, isDemo, firebaseReady, pendingVerificationEmail } = useApp();
  const [language, setLanguage] = useState(detectLanguage);
  const isDesktop = useIsDesktop();

  const handleChangeLanguage = (lang) => {
    setLanguage(lang);
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      settings.language = lang;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  };
  useEffect(() => {
    if (authLoading) return;
    if (user && !isDemo) {
      const authOrLandingPages = ['/', '/login', '/signup', '/forgot-password'];
      if (authOrLandingPages.includes(location.pathname)) {
        navigate('/app', { replace: true });
      }
    }
  }, [user, authLoading, isDemo, location.pathname, navigate]);

  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    if (existing) existing.remove();
    if (!NOINDEX_PATHS.includes(location.pathname)) return;
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');
    document.head.appendChild(meta);
  }, [location.pathname]);

  if (location.pathname === '/auth/action') {
    return <AuthActionPage language={language} navigate={navigate} />;
  }

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (pendingVerificationEmail) {
    return <VerifyEmailPage language={language} />;
  }

  const path = location.pathname;
  if (path === '/imprint') return <ImprintPage onBack={() => navigate('/')} language={language} />;
  if (path === '/privacy') return <PrivacyPage onBack={() => navigate('/')} language={language} />;
  if (path === '/terms') return <TermsPage onBack={() => navigate('/')} language={language} />;
  if (path === '/cookie-statement') return <CookieStatementPage onBack={() => navigate('/')} language={language} />;
  if (path === '/contact') return <ContactPage onBack={() => navigate('/')} language={language} />;
  if (path === '/login') {
    if (!firebaseReady) return <FirebaseSetupNotice onBack={() => navigate('/')} onTryDemo={() => navigate('/app')} language={language} />;
    return (
      <LoginPage
        onBack={() => navigate('/')}
        onSwitchToSignup={() => navigate('/signup')}
        onForgotPassword={() => navigate('/forgot-password')}
        onSuccess={() => navigate('/app', { replace: true })}
        language={language}
      />
    );
  }
  if (path === '/signup') {
    if (!firebaseReady) return <FirebaseSetupNotice onBack={() => navigate('/')} onTryDemo={() => navigate('/app')} language={language} />;
    return (
      <SignupPage
        onBack={() => navigate('/')}
        onSwitchToLogin={() => navigate('/login')}
        onSuccess={() => navigate('/app', { replace: true })}
        language={language}
      />
    );
  }
  if (path === '/forgot-password') {
    return (
      <ForgotPasswordPage
        onBack={() => navigate('/login')}
        language={language}
      />
    );
  }
  if (path === '/app') {
    if (isDesktop) return <DesktopNotice language={language} />;
    return (
      <MainAppContent
        onExitDemo={() => navigate('/', { replace: true })}
      />
    );
  }
  return (
    <LandingPage
      onStartDemo={() => navigate('/app')}
      onLogin={() => navigate('/login')}
      onSignup={() => navigate('/signup')}
      language={language}
      onChangeLanguage={handleChangeLanguage}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="App min-h-screen">
          <AppRouter />
          <Toaster position="top-center" richColors closeButton />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
