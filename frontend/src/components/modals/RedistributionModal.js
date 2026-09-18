import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CurrencyInput } from "../ui/currency-input";
import { useApp } from "../../context/AppContext";
import { formatCurrency } from "../../lib/currency";
import { toast } from "sonner";
import { Plus, Trash2, AlertCircle } from "lucide-react";

export function RedistributionModal({ open, onOpenChange, budget }) {
  const { t, settings, budgets, redistributeRemainder } = useApp();
  const [distributions, setDistributions] = useState([]);

  const pendingRemainder = budget?.pending_remainder || 0;
  const totalDistributed = distributions.reduce((sum, d) => sum + (d.amount || 0), 0);
  const remainingToDistribute = pendingRemainder - totalDistributed;
  const availableBudgets = budgets.filter(b => b.id !== budget?.id);

  useEffect(() => {
    if (open && pendingRemainder > 0) {
      setDistributions([{ budgetId: budget?.id || '', amount: pendingRemainder }]);
    } else {
      setDistributions([]);
    }
  }, [open, budget?.id, pendingRemainder]);

  const addDistribution = () => {
    setDistributions([...distributions, { budgetId: '', amount: 0 }]);
  };

  const removeDistribution = (index) => {
    setDistributions(distributions.filter((_, i) => i !== index));
  };

  const updateDistribution = (index, field, value) => {
    const updated = [...distributions];
    updated[index] = { ...updated[index], [field]: value };
    setDistributions(updated);
  };

  const handleSubmit = () => {
    const validDistributions = distributions.filter(d => d.budgetId && d.amount > 0);
    
    if (validDistributions.length === 0) {
      toast.error(t.errorOccurred);
      return;
    }

    if (totalDistributed > pendingRemainder) {
      toast.error(t.errorOccurred);
      return;
    }

    redistributeRemainder(budget.id, validDistributions);
    onOpenChange(false);
  };

  if (!budget || pendingRemainder <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            {t.redistributeRemainder}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t.pendingRemainder}: <span className="font-semibold text-foreground">{formatCurrency(pendingRemainder, settings.currency)}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t.remainingToDistribute}: <span className={`font-semibold ${remainingToDistribute === 0 ? 'text-success' : 'text-foreground'}`}>
                {formatCurrency(remainingToDistribute, settings.currency)}
              </span>
            </p>
          </div>

          <div className="space-y-3">
            {distributions.map((dist, index) => (
              <div key={index} className="flex items-end gap-2 p-3 bg-card border rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{t.budget}</Label>
                  <Select 
                    value={dist.budgetId} 
                    onValueChange={(v) => updateDistribution(index, 'budgetId', v)}
                  >
                    <SelectTrigger className="h-10" data-testid={`redistribution-budget-select-${index}`}>
                      <SelectValue placeholder={t.selectBudget || "Budget wählen"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={budget.id}>{budget.name} ({t.same || "Gleich"})</SelectItem>
                      {availableBudgets.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">{t.amount}</Label>
                  <CurrencyInput
                    value={dist.amount}
                    onChange={(v) => updateDistribution(index, 'amount', v)}
                    currency={settings.currency}
                    className="h-10"
                    data-testid={`redistribution-amount-${index}`}
                  />
                </div>
                {distributions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive hover:text-destructive"
                    onClick={() => removeDistribution(index)}
                    data-testid={`redistribution-remove-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={addDistribution}
            disabled={remainingToDistribute <= 0}
            data-testid="redistribution-add-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.addMore || "Weitere hinzufügen"}
          </Button>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={totalDistributed <= 0 || totalDistributed > pendingRemainder}
              data-testid="redistribution-submit-btn"
            >
              {t.redistribute}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RedistributionModal;
