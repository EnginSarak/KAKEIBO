# KAKEIBO — Firebase einrichten

KAKEIBO speichert Konten, Budgets und Transaktionen in **Firebase** (Google) und
wickelt Login/Registrierung über **Firebase Authentication** ab. Firebase ist im
kostenlosen „Spark"-Tarif für persönliche Nutzung völlig ausreichend — keine Kreditkarte
nötig.

Diese Anleitung dauert ca. **10 Minuten**. Danach funktionieren Registrierung, Login,
E-Mail-Bestätigung und Datenspeicherung.

> Nur schnell ausprobieren, ohne Konto? Starte die App und klicke auf der Startseite auf
> **Demo** — der Demo-Modus läuft komplett ohne Firebase (Daten bleiben lokal im Browser).
> Für echtes Login/Registrieren brauchst du die Schritte unten.

---

## 1. Firebase-Projekt anlegen

1. Öffne <https://console.firebase.google.com> und melde dich mit einem Google-Konto an.
2. Klicke **„Projekt hinzufügen"**, gib einen Namen ein (z. B. `kakeibo`), **Weiter**.
3. Google Analytics kannst du **deaktivieren** (nicht nötig), dann **Projekt erstellen**.

## 2. Web-App hinzufügen und Config kopieren

1. Im Projekt-Dashboard auf das **Web-Symbol** `</>` klicken („App hinzufügen").
2. Spitzname z. B. `kakeibo-web`, **App registrieren** (Hosting NICHT ankreuzen).
3. Firebase zeigt dir ein `firebaseConfig`-Objekt. Diese Werte brauchst du gleich:

   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "kakeibo-xxxx.firebaseapp.com",
     projectId: "kakeibo-xxxx",
     storageBucket: "kakeibo-xxxx.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef…",
     measurementId: "G-XXXXXXX"   // optional
   };
   ```

   Lass die Seite offen oder kopiere die Werte — sie kommen in Schritt 5 in `.env`.

## 3. Login-Methode „E-Mail/Passwort" aktivieren

1. Linkes Menü → **Build → Authentication** → **Get started**.
2. Reiter **Sign-in method** → **Email/Password** → **aktivieren** → **Speichern**.

Das genügt: Firebase verschickt die **Bestätigungs-E-Mails automatisch** über seinen
eigenen Mailversand — du musst keinen Mailserver einrichten.

## 4. Firestore-Datenbank anlegen

1. Linkes Menü → **Build → Firestore Database** → **Create database**.
2. Wähle eine Region in der Nähe (z. B. `eur3` / Frankfurt) → **Weiter**.
3. Starte im **Production mode** (die App bringt eigene Sicherheitsregeln mit) → **Erstellen**.

### Sicherheitsregeln übernehmen

Damit jeder Nutzer nur seine eigenen Daten sieht, die Regeln aus `firestore.rules`
(im Projekt-Root) übernehmen — entweder per CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # dein Projekt auswählen
firebase deploy --only firestore:rules,firestore:indexes
```

…oder manuell: In der Console **Firestore → Rules**, den Inhalt von `firestore.rules`
einfügen, **Publish**. (Composite-Indizes bei Bedarf aus `firestore.indexes.json`.)

## 5. Werte in `frontend/.env` eintragen

1. Kopiere die Vorlage:

   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Trage die Werte aus Schritt 2 ein:

   ```
   REACT_APP_FIREBASE_API_KEY=AIza…
   REACT_APP_FIREBASE_AUTH_DOMAIN=kakeibo-xxxx.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=kakeibo-xxxx
   REACT_APP_FIREBASE_STORAGE_BUCKET=kakeibo-xxxx.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
   REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abcdef…
   REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
   REACT_APP_USE_FIREBASE_EMULATOR=false
   ```

   `.env` ist per `.gitignore` ausgeschlossen und wird **nicht** committet.

## 6. Lokal starten

```bash
cd frontend
yarn install
yarn start
```

App läuft auf <http://localhost:3000>. Registrieren → Bestätigungsmail klicken → die
App erkennt die Bestätigung automatisch und loggt dich ein.

## 7. Auf Vercel deployen

Im Vercel-Projekt (Root Directory = `frontend`, Framework „Create React App") **dieselben
`REACT_APP_FIREBASE_*`-Variablen** unter **Settings → Environment Variables** hinterlegen —
sie werden zur Build-Zeit eingebacken, müssen also **vor** dem Build gesetzt sein. Danach
neu deployen.

Zuletzt in der Firebase-Console unter **Authentication → Settings → Authorized domains**
deine Vercel-Domain hinzufügen.

## 8. Automatische Weiterleitung nach der E-Mail-Bestätigung (empfohlen)

Damit der Bestätigungslink **in der App landet und direkt ins Dashboard weiterleitet**
(statt auf der Firebase-Standardseite „Your email has been verified" zu enden), muss die
**Aktions-URL** auf die App zeigen:

1. Firebase-Console → **Authentication → Templates** (Vorlagen).
2. Bei **„E-Mail-Adresse bestätigen"** oben auf das Stift-Symbol → **Aktions-URL anpassen**
   (engl. *Customize action URL*).
3. Eintragen: `https://DEINE-VERCEL-DOMAIN/auth/action`
   (z. B. `https://kakeibo-application.vercel.app/auth/action`).
4. Speichern.

Die App verarbeitet unter `/auth/action` **alle** E-Mail-Aktionen (Bestätigung,
Passwort-Zurücksetzen, E-Mail-Änderung) selbst und leitet danach automatisch weiter —
also gilt diese eine Aktions-URL für sämtliche Auth-Mails. Solange diese Einstellung
nicht gesetzt ist, funktioniert alles weiterhin, zeigt aber nur einen „Weiter"-Button
zurück zur App (die Bestätigung erkennt die App dann per Hintergrund-Abfrage).

---

## Optional: Lokaler Emulator (ohne echtes Projekt testen)

Zum Entwickeln/Testen ganz ohne Cloud-Projekt:

```bash
npm install -g firebase-tools
firebase emulators:start        # Auth :9099, Firestore :8080, UI :4000
```

In `frontend/.env` setzen: `REACT_APP_USE_FIREBASE_EMULATOR=true` (die übrigen Werte
dürfen Platzhalter bleiben), dann `yarn start`. Registrierte Test-Accounts landen im
Emulator; Bestätigungslinks erscheinen in der Emulator-UI unter <http://localhost:4000>.

---

## Fehlerbehebung

- **`auth/invalid-api-key` / „Backend nicht verbunden"** — `.env` fehlt oder enthält noch
  Platzhalter. Werte prüfen und `yarn start` neu starten (CRA liest `.env` nur beim Start).
- **Bestätigungsmail kommt nicht an** — Spam-Ordner prüfen; im Bestätigungs-Screen auf
  **„E-Mail erneut senden"**. Absender ist `noreply@<projekt>.firebaseapp.com`.
- **`Missing or insufficient permissions`** — die Firestore-Regeln aus Schritt 4 wurden
  noch nicht veröffentlicht.
- **Login sagt „Bitte bestätige zuerst deine E-Mail"** — Konto ist noch unbestätigt; Link
  in der Mail klicken. Der Screen aktualisiert sich danach automatisch.
