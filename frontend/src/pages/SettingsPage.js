import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  User,
  Globe,
  Coins,
  Lock,
  LogOut,
  Trash2,
  Moon,
  Sun,
  ChevronRight,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";
import { changePassword, changeEmail, deleteUserAccount } from "../lib/auth";
import { languageNames } from "../lib/i18n";
import { maskIban, searchBanks } from "../lib/bank";
import { currencyNames } from "../lib/currency";
import { toast } from "sonner";

export function SettingsPage({ onBack, onExitDemo }) {
  const {
    t,
    settings,
    updateSettings,
    isDemo,
    user,
    logout,
    accounts,
    bankSyncAvailable,
    bankConnections,
    bankSyncing,
    connectBank,
    bankConnecting,
    updateBankConnection,
    disconnectBank,
    syncBank,
  } = useApp();
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [tempName, setTempName] = useState(settings.displayName);
  const [tempEmail, setTempEmail] = useState(settings.email);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [bankResults, setBankResults] = useState([]);
  const [bankSearching, setBankSearching] = useState(false);
  const [bankSearched, setBankSearched] = useState(false);

  const formatDate = (value) => {
    if (!value) return t.bankSyncNever;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t.bankSyncNever;
    return new Intl.DateTimeFormat(
      settings.language === "en" ? "en-GB" : `${settings.language}-${settings.language.toUpperCase()}`,
      { day: "2-digit", month: "2-digit", year: "numeric" }
    ).format(parsed);
  };

  const bankErrorText = (error) => {
    if (error?.status === 404) return t.bankSyncErrorSession;
    if (error?.status === 429) return t.bankSyncErrorRateLimit;
    return t.bankSyncErrorGeneric;
  };

  const handleBankSearch = async () => {
    setBankSearching(true);
    try {
      const result = await searchBanks(bankQuery.trim());
      setBankResults(result.banks || []);
      setBankSearched(true);
    } catch (error) {
      toast.error(bankErrorText(error));
    } finally {
      setBankSearching(false);
    }
  };

  const handleBankConnect = async (bank) => {
    setBankBusy(true);
    try {
      await connectBank({
        name: bank.name,
        country: bank.country,
        psuType: (bank.psuTypes || []).includes("personal") ? "personal" : "business",
      });
    } catch (error) {
      toast.error(bankErrorText(error));
      setBankBusy(false);
    }
  };

  const handleBankSync = async (connectionId) => {
    try {
      const result = await syncBank(connectionId);
      if (!result) return;
      if (result.truncated) toast.warning(t.bankSyncTruncated);
      if (result.imported > 0) {
        toast.success(`${t.bankSyncImported} ${result.imported}`, {
          description: result.skipped > 0 ? `${t.bankSyncSkipped} ${result.skipped}` : t.bankSyncUncategorised,
        });
      } else {
        toast.success(t.bankSyncNoNew, {
          description: result.balance !== null ? t.bankSyncBalanceUpdated : undefined,
        });
      }
    } catch (error) {
      toast.error(bankErrorText(error));
    }
  };

  const handleBankDisconnect = async (connectionId) => {
    try {
      await disconnectBank(connectionId);
      toast.success(t.bankSyncDisconnected);
    } catch (error) {
      toast.error(bankErrorText(error));
    }
  };
  
  const handleSaveName = () => {
    updateSettings({ displayName: tempName });
    setEditingName(false);
  };
  
  const handleSaveEmail = async () => {
    if (isDemo) {
      updateSettings({ email: tempEmail });
      setEditingEmail(false);
      return;
    }
    const pwd = prompt("Aktuelles Passwort zur Bestätigung:");
    if (!pwd) return;
    try {
      await changeEmail(pwd, tempEmail);
      updateSettings({ email: tempEmail });
      setEditingEmail(false);
    } catch (error) {
      toast.error(error.message || t.errorOccurred);
    }
  };
  
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t.errorOccurred);
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t.errorOccurred);
      return;
    }
    if (isDemo) {
      toast.success(t.passwordChanged);
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      toast.success(t.passwordChanged);
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error) {
      toast.error(error.message || t.errorOccurred);
    }
  };
  
  const handleDeleteAccount = async () => {
    const deleteWord = settings.language === "de" ? "löschen" : 
                       settings.language === "es" ? "eliminar" :
                       settings.language === "fr" ? "supprimer" :
                       settings.language === "it" ? "elimina" : "delete";
    
    if (deleteConfirmText.toLowerCase() !== deleteWord) {
      toast.error(t.errorOccurred);
      return;
    }

    if (isDemo) {
      localStorage.removeItem("kakeibo_demo_data");
      localStorage.removeItem("kakeibo_settings");
      window.location.href = "/";
      return;
    }

    const pwd = prompt("Aktuelles Passwort zur Bestätigung:");
    if (!pwd) return;
    try {
      await deleteUserAccount(pwd);
      window.location.href = "/";
    } catch (error) {
      toast.error(error.message || t.errorOccurred);
    }
  };
  
  const handleExitDemo = () => {
    localStorage.removeItem("kakeibo_data");
    localStorage.removeItem("kakeibo_settings");
    if (onExitDemo) {
      onExitDemo();
    } else {
      window.location.reload();
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    window.location.replace("/");
  };
  
  const deleteWord = settings.language === "de" ? "löschen" : 
                     settings.language === "es" ? "eliminar" :
                     settings.language === "fr" ? "supprimer" :
                     settings.language === "it" ? "elimina" : "delete";
  const exitDemoText = settings.language === "de" ? "Demo-Modus verlassen" :
                       settings.language === "es" ? "Salir del modo demo" :
                       settings.language === "fr" ? "Quitter le mode démo" :
                       settings.language === "it" ? "Esci dalla modalità demo" : "Exit Demo Mode";
  
  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-xl font-heading font-semibold text-foreground">
            {t.settings}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="settings-back-btn"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="p-4 space-y-6 pb-24">
          {isDemo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-accent/10 border border-accent/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t.demoMode}</p>
                  <p className="text-sm text-muted-foreground">{t.demoModeDescUpdated || t.demoModeDesc}</p>
                </div>
              </div>
            </motion.div>
          )}
          
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t.profile}
            </h2>
            
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className={cn("p-4", isDemo && "opacity-50")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isDemo ? "bg-muted" : "bg-primary/10"
                    )}>
                      <User className={cn("w-5 h-5", isDemo ? "text-muted-foreground" : "text-primary")} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.displayName}</p>
                      {!isDemo && editingName ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="h-8 w-40"
                            data-testid="display-name-input"
                          />
                          <Button size="sm" onClick={handleSaveName} data-testid="save-name-btn">
                            {t.save}
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium text-foreground">{settings.displayName}</p>
                      )}
                    </div>
                  </div>
                  {!isDemo && !editingName && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTempName(settings.displayName);
                        setEditingName(true);
                      }}
                      data-testid="edit-name-btn"
                    >
                      {t.edit}
                    </Button>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className={cn("p-4", isDemo && "opacity-50")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.email}</p>
                    {!isDemo && editingEmail ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="email"
                          value={tempEmail}
                          onChange={(e) => setTempEmail(e.target.value)}
                          className="h-8 w-48"
                          data-testid="email-input"
                        />
                        <Button size="sm" onClick={handleSaveEmail} data-testid="save-email-btn">
                          {t.save}
                        </Button>
                      </div>
                    ) : (
                      <p className="font-medium text-foreground">{settings.email}</p>
                    )}
                  </div>
                  {!isDemo && !editingEmail && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTempEmail(settings.email);
                        setEditingEmail(true);
                      }}
                      data-testid="edit-email-btn"
                    >
                      {t.edit}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Einstellungen
            </h2>
            
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {settings.theme === "dark" ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Theme</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.theme === "dark" ? "Dark Mode" : "Light Mode"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.theme === "dark"}
                  onCheckedChange={(checked) => {
                    updateSettings({ theme: checked ? "dark" : "light" });
                  }}
                  data-testid="theme-toggle-switch"
                />
              </div>
              
              <Separator />
              
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t.language}</p>
                    </div>
                  </div>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => updateSettings({ language: value })}
                  >
                    <SelectTrigger className="w-32" data-testid="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageNames).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t.currency}</p>
                    </div>
                  </div>
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => updateSettings({ currency: value })}
                  >
                    <SelectTrigger className="w-40" data-testid="currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(currencyNames).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>
          
          {bankSyncAvailable && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t.bankSync}
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] tracking-normal normal-case">
                  {t.bankSyncBeta}
                </span>
              </h2>

              {bankConnections.length === 0 && (
                <div className="rounded-2xl bg-card border border-border p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{t.bankSyncNotConnected}</p>
                    <p className="text-sm text-muted-foreground">{t.bankSyncIntro}</p>
                  </div>
                </div>
              )}

              {bankConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                  data-testid={`bank-connection-${connection.id}`}
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {connection.bankName || t.bankSyncConnected}
                      </p>
                      <p className="text-sm text-muted-foreground break-words">
                        {[connection.bankAccountName, maskIban(connection.bankAccountIban)]
                          .filter(Boolean)
                          .join(" · ") || t.bankSyncConnected}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 space-y-2">
                    <Label>{t.bankSyncAccount}</Label>
                    <Select
                      value={connection.accountId || ""}
                      onValueChange={(value) => updateBankConnection(connection.id, { accountId: value })}
                      disabled={accounts.length === 0}
                    >
                      <SelectTrigger className="h-12" data-testid={`bank-account-select-${connection.id}`}>
                        <SelectValue placeholder={t.bankSyncSelectAccount} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {accounts.length === 0 ? t.bankSyncNoAccounts : t.bankSyncAccountHint}
                    </p>
                  </div>

                  <Separator />

                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{t.bankSyncAuto}</p>
                      <p className="text-sm text-muted-foreground">{t.bankSyncAutoHint}</p>
                    </div>
                    <Switch
                      checked={connection.autoSync !== false}
                      onCheckedChange={(checked) => updateBankConnection(connection.id, { autoSync: checked })}
                      data-testid={`bank-autosync-switch-${connection.id}`}
                    />
                  </div>

                  <Separator />

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t.bankSyncLastSync}</span>
                      <span className="text-foreground tabular-nums">{formatDate(connection.lastSyncAt)}</span>
                    </div>
                    {connection.validUntil && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t.bankSyncValidUntil}</span>
                        <span className="text-foreground tabular-nums">{formatDate(connection.validUntil)}</span>
                      </div>
                    )}
                    {connection.lastSyncTruncated && (
                      <p className="text-xs text-warning">{t.bankSyncTruncated}</p>
                    )}
                    <Button
                      className="w-full h-12 bg-primary hover:bg-primary/90"
                      onClick={() => handleBankSync(connection.id)}
                      disabled={bankSyncing || !connection.accountId}
                      data-testid={`bank-sync-btn-${connection.id}`}
                    >
                      {bankSyncing ? t.bankSyncFetching : t.bankSyncFetch}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t.bankSyncRenewHint}</p>
                  </div>

                  <Separator />

                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleBankDisconnect(connection.id)}
                    data-testid={`bank-disconnect-btn-${connection.id}`}
                  >
                    <p className="font-medium text-destructive">{t.bankSyncDisconnect}</p>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <div className="p-4 space-y-3">
                  <Label htmlFor="bank-search">{t.bankSyncAddBank}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bank-search"
                      value={bankQuery}
                      onChange={(e) => setBankQuery(e.target.value)}
                      placeholder={t.bankSyncSearchPlaceholder}
                      className="h-12"
                      data-testid="bank-search-input"
                    />
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={handleBankSearch}
                      disabled={bankSearching || bankQuery.trim().length < 2}
                      data-testid="bank-search-btn"
                    >
                      {bankSearching ? "…" : t.bankSyncSearch}
                    </Button>
                  </div>

                  {bankResults.map((bank) => (
                    <div
                      key={`${bank.name}-${bank.bic || ""}`}
                      className="flex items-center justify-between gap-3 py-2 border-t border-border"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{bank.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[bank.bic, bank.beta ? t.bankSyncBeta : null].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBankConnect(bank)}
                        disabled={bankBusy || bankConnecting}
                        data-testid={`bank-connect-${bank.name}`}
                      >
                        {bankBusy || bankConnecting ? t.bankSyncConnecting : t.bankSyncConnect}
                      </Button>
                    </div>
                  ))}

                  {bankSearched && bankResults.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t.bankSyncNoBanks}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Sicherheit
            </h2>
            
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div
                className={cn(
                  "p-4 flex items-center justify-between transition-colors",
                  isDemo 
                    ? "opacity-50 cursor-not-allowed" 
                    : "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => !isDemo && setShowPasswordModal(true)}
                data-testid="change-password-setting"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isDemo ? "bg-muted" : "bg-primary/10"
                  )}>
                    <Lock className={cn("w-5 h-5", isDemo ? "text-muted-foreground" : "text-primary")} />
                  </div>
                  <div>
                    <p className={cn("font-medium", isDemo ? "text-muted-foreground" : "text-foreground")}>
                      {t.changePassword}
                    </p>
                  </div>
                </div>
                {!isDemo && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </div>
              
              <Separator />
              
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={isDemo ? handleExitDemo : handleLogout}
                data-testid="logout-setting"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {isDemo ? exitDemoText : t.logout}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </section>
          
          {!isDemo && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-destructive uppercase tracking-wider">
                Gefahrenzone
              </h2>
              
              <div className="rounded-2xl bg-destructive/5 border border-destructive/20 overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-destructive/10 transition-colors"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="delete-account-setting"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-destructive">{t.deleteAccount}</p>
                      <p className="text-sm text-muted-foreground">
                        {t.deleteAccountWarning}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
      
      {!isDemo && (
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent data-testid="password-modal">
            <DialogHeader>
              <DialogTitle className="font-heading">{t.changePassword}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t.currentPassword}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12"
                  data-testid="current-password-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">{t.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12"
                  data-testid="new-password-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  data-testid="confirm-password-input"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPasswordModal(false)}
                data-testid="password-cancel-btn"
              >
                {t.cancel}
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handlePasswordChange}
                disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                data-testid="password-save-btn"
              >
                {t.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {!isDemo && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                {t.deleteAccount}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteAccountWarning}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Label htmlFor="delete-confirm">{t.typeDelete} "{deleteWord}"</Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-2 h-12"
                placeholder={deleteWord}
                data-testid="delete-confirm-input"
              />
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-cancel-btn">
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== deleteWord}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="delete-confirm-btn"
              >
                {t.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default SettingsPage;
