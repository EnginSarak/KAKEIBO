import React from "react";
import { ArrowLeft } from "lucide-react";

const LegalPageWrapper = ({ title, children, onBack }) => (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Zurück</span>
        </button>
      </div>
    </header>
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-8">{title}</h1>
      <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
        {children}
      </div>
    </main>
  </div>
);

export function ImprintPage({ onBack, language = "de" }) {
  const content = {
    de: (
      <>
        <h2>Impressum</h2>
        <h3>Angaben gemäß § 5 DDG</h3>
        <p>
          Engin Sarak<br />
          c/o Nadim Sarak<br />
          Schallmauer 16<br />
          50226 Frechen<br />
          Deutschland
        </p>
        <h3>Kontakt</h3>
        <p>
          E-Mail: mail@enginsarak.com
        </p>
        <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
        <p>
          Engin Sarak<br />
          c/o Nadim Sarak<br />
          Schallmauer 16<br />
          50226 Frechen
        </p>
      </>
    ),
    en: (
      <>
        <h2>Legal Notice</h2>
        <h3>Information according to § 5 DDG</h3>
        <p>
          Engin Sarak<br />
          c/o Nadim Sarak<br />
          Schallmauer 16<br />
          50226 Frechen<br />
          Germany
        </p>
        <h3>Contact</h3>
        <p>
          Email: mail@enginsarak.com
        </p>
        <h3>Responsible for content according to § 18 (2) MStV</h3>
        <p>
          Engin Sarak<br />
          c/o Nadim Sarak<br />
          Schallmauer 16<br />
          50226 Frechen
        </p>
      </>
    ),
  };

  return (
    <LegalPageWrapper title={language === "de" ? "Impressum" : "Legal Notice"} onBack={onBack}>
      {content[language] || content.de}
    </LegalPageWrapper>
  );
}

export function PrivacyPage({ onBack, language = "de" }) {
  const content = {
    de: (
      <>
        <h2>Datenschutzerklärung</h2>
        <p><strong>Stand: Februar 2026</strong></p>
        
        <h3>1. Verantwortlicher</h3>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
          Engin Sarak, c/o Nadim Sarak, Schallmauer 16, 50226 Frechen<br />
          E-Mail: mail@enginsarak.com
        </p>

        <h3>2. Erhobene Daten</h3>
        <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
        <ul>
          <li>Kontodaten (E-Mail, Name bei Registrierung)</li>
          <li>Finanzdaten (Kontostände, Budgets, Transaktionen)</li>
          <li>Technische Daten (IP-Adresse, Browser-Typ, Geräteinformationen)</li>
        </ul>

        <h3>3. Zweck der Verarbeitung</h3>
        <p>Die Daten werden verarbeitet, um:</p>
        <ul>
          <li>Die App-Funktionalität bereitzustellen</li>
          <li>Ihr Benutzerkonto zu verwalten</li>
          <li>Die Sicherheit unserer Dienste zu gewährleisten</li>
        </ul>

        <h3>4. Speicherdauer</h3>
        <p>
          Ihre Daten werden so lange gespeichert, wie Sie ein aktives Konto bei uns haben.
          Nach Löschung Ihres Kontos werden die Daten innerhalb von 30 Tagen entfernt.
        </p>

        <h3>5. Ihre Rechte</h3>
        <p>Sie haben das Recht auf:</p>
        <ul>
          <li>Auskunft über Ihre gespeicherten Daten</li>
          <li>Berichtigung unrichtiger Daten</li>
          <li>Löschung Ihrer Daten</li>
          <li>Einschränkung der Verarbeitung</li>
          <li>Datenübertragbarkeit</li>
          <li>Widerspruch gegen die Verarbeitung</li>
        </ul>

        <h3>6. Kontakt</h3>
        <p>
          Bei Fragen zum Datenschutz wenden Sie sich an:<br />
          mail@enginsarak.com
        </p>
      </>
    ),
    en: (
      <>
        <h2>Privacy Policy</h2>
        <p><strong>Last updated: February 2026</strong></p>
        
        <h3>1. Data Controller</h3>
        <p>
          The data controller for this website is:<br />
          Engin Sarak, c/o Nadim Sarak, Schallmauer 16, 50226 Frechen<br />
          Email: mail@enginsarak.com
        </p>

        <h3>2. Data Collected</h3>
        <p>We collect and process the following personal data:</p>
        <ul>
          <li>Account data (email, name during registration)</li>
          <li>Financial data (balances, budgets, transactions)</li>
          <li>Technical data (IP address, browser type, device information)</li>
        </ul>

        <h3>3. Purpose of Processing</h3>
        <p>Data is processed to:</p>
        <ul>
          <li>Provide app functionality</li>
          <li>Manage your user account</li>
          <li>Ensure the security of our services</li>
        </ul>

        <h3>4. Your Rights</h3>
        <p>You have the right to:</p>
        <ul>
          <li>Access your stored data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data</li>
          <li>Restrict processing</li>
          <li>Data portability</li>
          <li>Object to processing</li>
        </ul>
      </>
    ),
  };

  return (
    <LegalPageWrapper title={language === "de" ? "Datenschutz" : "Privacy Policy"} onBack={onBack}>
      {content[language] || content.de}
    </LegalPageWrapper>
  );
}

export function TermsPage({ onBack, language = "de" }) {
  const content = {
    de: (
      <>
        <h2>Allgemeine Geschäftsbedingungen</h2>
        <p><strong>Stand: Februar 2026</strong></p>

        <h3>1. Geltungsbereich</h3>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Kakeibo App
          und aller damit verbundenen Dienste.
        </p>

        <h3>2. Leistungsbeschreibung</h3>
        <p>
          Kakeibo bietet eine digitale Plattform zur Verwaltung persönlicher Finanzen,
          einschließlich Budgetplanung, Transaktionsverfolgung und Kontoübersicht.
        </p>

        <h3>3. Registrierung und Konto</h3>
        <p>
          Für die Nutzung der vollständigen Funktionen ist eine Registrierung erforderlich.
          Der Nutzer ist für die Sicherheit seiner Zugangsdaten verantwortlich.
        </p>

        <h3>4. Nutzungsrechte</h3>
        <p>
          Der Nutzer erhält ein nicht-exklusives, nicht übertragbares Recht zur Nutzung
          der App für persönliche, nicht-kommerzielle Zwecke.
        </p>

        <h3>5. Haftung</h3>
        <p>
          Die Haftung für leicht fahrlässige Pflichtverletzungen ist ausgeschlossen,
          sofern keine wesentlichen Vertragspflichten betroffen sind.
        </p>

        <h3>6. Änderungen</h3>
        <p>
          Wir behalten uns vor, diese AGB jederzeit zu ändern.
          Änderungen werden dem Nutzer rechtzeitig mitgeteilt.
        </p>

        <h3>7. Anwendbares Recht</h3>
        <p>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.
          Gerichtsstand ist Berlin.
        </p>
      </>
    ),
    en: (
      <>
        <h2>Terms of Service</h2>
        <p><strong>Last updated: February 2026</strong></p>

        <h3>1. Scope</h3>
        <p>
          These Terms of Service apply to the use of the Kakeibo App
          and all related services.
        </p>

        <h3>2. Service Description</h3>
        <p>
          Kakeibo provides a digital platform for managing personal finances,
          including budget planning, transaction tracking, and account overview.
        </p>

        <h3>3. Registration and Account</h3>
        <p>
          Registration is required for full functionality.
          Users are responsible for the security of their credentials.
        </p>

        <h3>4. Usage Rights</h3>
        <p>
          Users receive a non-exclusive, non-transferable right to use
          the app for personal, non-commercial purposes.
        </p>

        <h3>5. Liability</h3>
        <p>
          Liability for minor negligent breaches is excluded,
          unless essential contractual obligations are affected.
        </p>

        <h3>6. Governing Law</h3>
        <p>
          German law applies, excluding the UN Convention on Contracts.
          Place of jurisdiction is Berlin.
        </p>
      </>
    ),
  };

  return (
    <LegalPageWrapper title={language === "de" ? "AGB" : "Terms of Service"} onBack={onBack}>
      {content[language] || content.de}
    </LegalPageWrapper>
  );
}

export function CookieStatementPage({ onBack, language = "de" }) {
  const content = {
    de: (
      <>
        <h2>Cookie-Statement</h2>
        <p><strong>Stand: Februar 2026</strong></p>

        <h3>Was sind Cookies?</h3>
        <p>
          Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden,
          wenn Sie unsere Website besuchen. Sie helfen uns, die Website-Funktionalität
          zu verbessern und Ihre Präferenzen zu speichern.
        </p>

        <h3>Welche Cookies verwenden wir?</h3>
        
        <h4>Notwendige Cookies</h4>
        <p>
          Diese Cookies sind für den Betrieb der Website unerlässlich.
          Sie ermöglichen grundlegende Funktionen wie Seitennavigation und
          Zugriff auf sichere Bereiche.
        </p>
        <ul>
          <li><strong>session_token</strong>: Authentifizierung, 7 Tage</li>
          <li><strong>kakeibo_cookie_consent</strong>: Cookie-Einstellungen, 1 Jahr</li>
        </ul>

        <h4>Analyse-Cookies</h4>
        <p>
          Diese Cookies helfen uns zu verstehen, wie Besucher mit unserer Website
          interagieren, indem sie Informationen anonym sammeln und melden.
        </p>

        <h4>Marketing-Cookies</h4>
        <p>
          Diese Cookies werden verwendet, um Besuchern relevante Werbung zu zeigen.
          Sie können in den Cookie-Einstellungen deaktiviert werden.
        </p>

        <h3>Cookie-Einstellungen ändern</h3>
        <p>
          Sie können Ihre Cookie-Einstellungen jederzeit über den Link
          "Cookie-Einstellungen" im Footer unserer Website ändern.
        </p>
      </>
    ),
    en: (
      <>
        <h2>Cookie Statement</h2>
        <p><strong>Last updated: February 2026</strong></p>

        <h3>What are Cookies?</h3>
        <p>
          Cookies are small text files stored on your device when you visit our website.
          They help us improve website functionality and save your preferences.
        </p>

        <h3>What Cookies do we use?</h3>
        
        <h4>Necessary Cookies</h4>
        <p>
          These cookies are essential for the website to function.
          They enable basic features like page navigation and access to secure areas.
        </p>
        <ul>
          <li><strong>session_token</strong>: Authentication, 7 days</li>
          <li><strong>kakeibo_cookie_consent</strong>: Cookie preferences, 1 year</li>
        </ul>

        <h4>Analytics Cookies</h4>
        <p>
          These cookies help us understand how visitors interact with our website
          by collecting and reporting information anonymously.
        </p>

        <h4>Marketing Cookies</h4>
        <p>
          These cookies are used to show visitors relevant ads.
          They can be disabled in the cookie settings.
        </p>

        <h3>Change Cookie Settings</h3>
        <p>
          You can change your cookie settings at any time via the
          "Cookie Settings" link in our website footer.
        </p>
      </>
    ),
  };

  return (
    <LegalPageWrapper title={language === "de" ? "Cookie-Statement" : "Cookie Statement"} onBack={onBack}>
      {content[language] || content.de}
    </LegalPageWrapper>
  );
}
