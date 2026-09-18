import React, { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { CurrencyInput } from "../ui/currency-input";
import { useApp } from "../../context/AppContext";
import { COLORS } from "../../lib/colors";
import { toast } from "sonner";

export function AccountModal({ open, onOpenChange, account = null }) {
  const {
    t,
    settings,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useApp();
  
  const isEditing = !!account;
  
  const [name, setName] = useState("");
  const [balanceValue, setBalanceValue] = useState(0);
  const [color, setColor] = useState(COLORS[0]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  useEffect(() => {
    if (open) {
      if (account) {
        setName(account.name);
        setBalanceValue(account.balance);
        setColor(account.color || COLORS[0]);
      } else {
        setName("");
        setBalanceValue(0);
        setColor(COLORS[0]);
      }
    }
  }, [open, account]);
  
  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t.errorOccurred);
      return;
    }
    
    const data = {
      name: name.trim(),
      balance: balanceValue,
      color,
    };
    
    if (isEditing) {
      updateAccount(account.id, data);
    } else {
      createAccount(data);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (account) {
      deleteAccount(account.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="account-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? t.edit + " " + t.account : t.newAccount}
            </DialogTitle>
          </DialogHeader>
          
          <div className="min-w-0 space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">{t.accountName}</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Girokonto"
                className="h-12"
                data-testid="account-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account-balance">{t.accountBalance}</Label>
              <CurrencyInput
                id="account-balance"
                value={balanceValue}
                onChange={setBalanceValue}
                currency={settings.currency}
                className="h-12 text-lg font-semibold tabular-nums"
                data-testid="account-balance-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-2 px-2 py-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${
                      color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    data-testid={`account-color-${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            {isEditing && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="account-delete-btn"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="account-cancel-btn"
            >
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={!name.trim()}
              data-testid="account-save-btn"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete} {t.account}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteAccountConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-account-cancel">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-account-confirm"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AccountModal;
