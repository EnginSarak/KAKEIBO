import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
import { cn } from "../../lib/utils";
import { transactionLabel } from "../../lib/bank";
import { useApp } from "../../context/AppContext";
import { toast } from "sonner";

export function TransactionModal({ open, onOpenChange, transaction = null, defaultAccountId = null, lockedBudgetId = null, oldTransactionOverride = null }) {
  const {
    t,
    settings,
    accounts,
    budgets,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useApp();
  
  const isEditing = !!transaction;
  const isFromBank = transaction?.source === "bank";
  
  const [type, setType] = useState("expense");
  const [amountValue, setAmountValue] = useState(0);
  const [name, setName] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (open) {
      if (transaction) {
        setType(transaction.transaction_type);
        setAmountValue(transaction.amount);
        setName(transaction.name === "..." ? "" : transaction.name);
        setBudgetId(transaction.budget_id || "none");
        setAccountId(transaction.account_id);
      } else {
        setType("expense");
        setAmountValue(0);
        setName("");
        setBudgetId(lockedBudgetId || "none");
        setAccountId(defaultAccountId || (accounts.length > 0 ? accounts[0].id : ""));
      }
    }
  }, [open, transaction, defaultAccountId, lockedBudgetId, accounts]);
  const availableBudgets = budgets;
  
  const handleSubmit = async () => {
    if (amountValue <= 0) {
      toast.error(t.errorOccurred);
      return;
    }

    if (!accountId) {
      toast.error(t.errorOccurred);
      return;
    }

    const data = {
      amount: amountValue,
      transaction_type: type,
      name: name || "...",
      budget_id: budgetId === "none" ? null : budgetId,
      account_id: accountId,
      ...(transaction?.needsReview ? { needsReview: false } : {}),
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateTransaction(transaction.id, data, oldTransactionOverride || transaction);
      } else {
        await createTransaction(data);
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!transaction) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transaction.id, oldTransactionOverride || transaction);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="transaction-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? t.edit + " " + t.transaction : t.newTransaction}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {isFromBank && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-primary/50 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {transaction?.needsReview ? t.bankSyncReviewHint : t.bankSyncFromBank}
                </p>
              </div>
            )}

            <div className="segmented-track flex p-1 rounded-xl">
              {[
                { key: "expense", Icon: Minus, label: t.expense },
                { key: "income", Icon: Plus, label: t.income },
              ].map(({ key, Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className="relative flex-1 py-2.5 px-4 rounded-lg font-medium"
                  data-testid={`transaction-type-${key}`}
                >
                  {type === key && (
                    <motion.span
                      layoutId="transaction-type-pill"
                      className="absolute inset-0 rounded-lg bg-card shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex items-center justify-center gap-2 transition-colors",
                      type === key ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">{t.amount}</Label>
              <CurrencyInput
                id="amount"
                value={amountValue}
                onChange={setAmountValue}
                currency={settings.currency}
                className="h-14 text-2xl font-semibold tabular-nums"
                data-testid="transaction-amount-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">{t.transactionName}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={transaction ? transactionLabel(transaction, t) : "..."}
                className="h-12"
                data-testid="transaction-name-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t.account}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-12" data-testid="transaction-account-select">
                  <SelectValue placeholder={t.account} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!lockedBudgetId && (
              <div className="space-y-2">
                <Label>{t.selectBudget}</Label>
                <Select value={budgetId} onValueChange={setBudgetId}>
                  <SelectTrigger className="h-12" data-testid="transaction-budget-select">
                    <SelectValue placeholder={t.noTag} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.noTag}</SelectItem>
                    {availableBudgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id}>
                        {budget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            {isEditing && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="transaction-delete-btn"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="transaction-cancel-btn"
            >
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={amountValue <= 0 || !accountId || isSaving}
              data-testid="transaction-save-btn"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete} {t.transaction}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.deleteTransactionConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-transaction-cancel">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-transaction-confirm"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default TransactionModal;
