import React, { useState, useEffect } from "react";
import { Trash2, CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
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
import { format } from "date-fns";
import { de, enUS, es, fr, it } from "date-fns/locale";
import { cn } from "../../lib/utils";
import { useApp } from "../../context/AppContext";
import { COLORS } from "../../lib/colors";
import { toast } from "sonner";

const dateLocales = { de, en: enUS, es, fr, it };

export function BudgetModal({ open, onOpenChange, budget = null, defaultType = "expense", defaultAccountId = null }) {
  const { t, settings, accounts, createBudget, updateBudget, deleteBudget, setBudgetCarryover } = useApp();

  const isEditing = !!budget;

  const [name, setName] = useState("");
  const [amountValue, setAmountValue] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [budgetType, setBudgetType] = useState(defaultType);
  const [interval, setInterval] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [color, setColor] = useState(COLORS[0]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (budget) {
        setName(budget.name);
        setAmountValue(budget.amount);
        setCurrentValue(budget.amount + (budget.carried_over || 0) - (budget.spent || 0));
        setBudgetType(budget.budget_type);
        setInterval(budget.interval);
        setStartDate(budget.start_date ? new Date(budget.start_date) : new Date());
        setColor(budget.color || COLORS[0]);
      } else {
        setName("");
        setAmountValue(0);
        setCurrentValue(0);
        setBudgetType(defaultType);
        setInterval("monthly");
        setStartDate(new Date());
        setColor(COLORS[0]);
      }
    }
  }, [open, budget, defaultType, defaultAccountId, accounts]);

  const handleSubmit = () => {
    if (!name.trim()) { toast.error(t.errorOccurred); return; }
    if (amountValue < 0) { toast.error(t.errorOccurred); return; }

    const data = {
      name: name.trim(),
      amount: amountValue,
      budget_type: budgetType,
      interval,
      start_date: startDate.toISOString(),
      color,
    };

    if (isEditing) {
      updateBudget(budget.id, data);
      const newCarryover = currentValue - amountValue + (budget.spent || 0);
      setBudgetCarryover(budget.id, newCarryover);
    } else {
      createBudget(data);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (budget) {
      deleteBudget(budget.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };

  const locale = dateLocales[settings.language] || de;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="budget-modal">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {isEditing ? t.edit + " " + t.budget : t.newBudget}
            </DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.budgetType}</Label>
              <Select value={budgetType} onValueChange={setBudgetType}>
                <SelectTrigger className="h-12" data-testid="budget-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t.expenseBudget}</SelectItem>
                  <SelectItem value="accumulating">{t.accumulatingBudget}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-name">{t.budgetName}</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={budgetType === "expense" ? "Lebensmittel" : "Urlaub"}
                className="h-12"
                data-testid="budget-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget-amount">{t.budgetAmount}</Label>
              <CurrencyInput
                id="budget-amount"
                value={amountValue}
                onChange={setAmountValue}
                currency={settings.currency}
                className="h-12 text-lg font-semibold tabular-nums"
                data-testid="budget-amount-input"
              />
            </div>

            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="budget-current">{t.currentStanding}</Label>
                <CurrencyInput
                  id="budget-current"
                  value={currentValue}
                  onChange={setCurrentValue}
                  currency={settings.currency}
                  className="h-12 text-lg font-semibold tabular-nums"
                  data-testid="budget-current-input"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-2 px-2 py-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${
                      color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    data-testid={`budget-color-${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.interval}</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="h-12" data-testid="budget-interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.daily}</SelectItem>
                  <SelectItem value="weekly">{t.weekly}</SelectItem>
                  <SelectItem value="monthly">{t.monthly}</SelectItem>
                  <SelectItem value="quarterly">{t.quarterly}</SelectItem>
                  <SelectItem value="yearly">{t.yearly}</SelectItem>
                  <SelectItem value="none">{t.none}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className={cn(interval === "none" && "text-muted-foreground")}>{t.startDate}</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={interval === "none"}
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      interval === "none" && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                    onClick={() => interval !== "none" && setDatePickerOpen(true)}
                    data-testid="budget-date-trigger"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {interval === "none" ? "-" : startDate ? format(startDate, "PPP", { locale }) : t.startDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100]" align="start" side="bottom" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => { if (date) { setStartDate(date); setDatePickerOpen(false); } }}
                    initialFocus
                    locale={locale}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing && (
              <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)} data-testid="budget-delete-btn">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} data-testid="budget-cancel-btn">
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={!name.trim() || amountValue < 0}
              data-testid="budget-save-btn"
            >
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete} {t.budget}?</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteBudgetConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-budget-cancel">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="delete-budget-confirm"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BudgetModal;
