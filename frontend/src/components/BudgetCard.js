import React from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { cn, budgetBarColor, BAR_FULL_COLOR, getInitials } from "../lib/utils";
import { formatCurrency } from "../lib/currency";
import { useApp } from "../context/AppContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function BudgetCard({ budget, onClick, onRedistribute, isEditMode = false, className }) {
  const { settings } = useApp();
  const total = budget.amount + (budget.carried_over || 0);
  const remaining = total - (budget.spent || 0);
  const pendingRemainder = budget.pending_remainder || 0;
  const hasPendingRemainder = pendingRemainder > 0;

  const isExpense = budget.budget_type === "expense";
  const capacity = isExpense ? budget.amount : total;
  const ratio = capacity > 0 ? remaining / capacity : (remaining > 0 ? 1 : 0);
  const fillPct = Math.max(0, Math.min(100, ratio * 100));
  const barColor = isExpense ? budgetBarColor(ratio) : BAR_FULL_COLOR;

  const avatarStyle = budget.color
    ? { backgroundColor: budget.color, color: '#fff' }
    : undefined;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-3 rounded-xl cursor-pointer transition-all",
        "bg-card border border-border",
        "active:bg-muted/50",
        className
      )}
      data-testid={`budget-card-${budget.id}`}
    >
      {hasPendingRemainder && (
        <button
          type="button"
          className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center"
          title={`${formatCurrency(pendingRemainder, settings.currency)}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRedistribute?.(budget);
          }}
          data-testid={`budget-pending-badge-${budget.id}`}
        >
          <span className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
        </button>
      )}
      
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0"
          style={avatarStyle}
          data-testid={`budget-avatar-${budget.id}`}
        >
          {getInitials(budget.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground text-sm truncate pr-2" data-testid={`budget-name-${budget.id}`}>
              {budget.name}
            </h3>
            <span
              className={cn(
                "font-semibold tabular-nums text-sm text-right w-20 flex-shrink-0",
                remaining < 0 ? "text-destructive" : "text-foreground"
              )}
              data-testid={`budget-remaining-${budget.id}`}
            >
              <AnimatedNumber
                value={remaining}
                from={0}
                format={(v) => formatCurrency(v, settings.currency)}
                duration={400}
              />
            </span>
          </div>

          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0, backgroundColor: barColor }}
              animate={{ width: `${fillPct}%`, backgroundColor: barColor }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              data-testid={`budget-progress-${budget.id}`}
            />
          </div>
        </div>

        {isEditMode && (
          <div className="flex-shrink-0 ml-1">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BudgetCardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-card border border-border animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
          <div className="mt-1.5 h-1.5 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default BudgetCard;
