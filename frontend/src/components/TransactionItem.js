import React from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn, getInitials } from "../lib/utils";
import { transactionLabel } from "../lib/bank";
import { formatCurrency } from "../lib/currency";
import { useApp } from "../context/AppContext";
import { AnimatedNumber } from "./AnimatedNumber";

export function TransactionItem({ transaction, onClick, showBudget = true }) {
  const { settings, getBudgetById, t } = useApp();
  const budget = transaction.budget_id ? getBudgetById(transaction.budget_id) : null;
  const isExpense = transaction.transaction_type === "expense";
  const needsReview = transaction.needsReview === true;

  return (
    <motion.div
      whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer",
        "transition-colors duration-150"
      )}
      data-testid={`transaction-item-${transaction.id}`}
    >
      <div className="relative flex-shrink-0">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            isExpense
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success"
          )}
          style={budget?.color ? { backgroundColor: budget.color + '22', color: budget.color } : undefined}
        >
          {budget ? (
            <span className="font-bold text-sm">{getInitials(budget.name)}</span>
          ) : isExpense ? (
            <motion.span
              initial={{ x: 5, y: -5, opacity: 0 }}
              whileInView={{ x: 0, y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
            >
              <ArrowDownLeft className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span
              initial={{ x: -5, y: 5, opacity: 0 }}
              whileInView={{ x: 0, y: 0, opacity: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
            >
              <ArrowUpRight className="w-5 h-5" />
            </motion.span>
          )}
        </motion.div>
        {needsReview && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.18, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white ring-2 ring-primary/50"
            data-testid={`transaction-review-${transaction.id}`}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate" data-testid={`transaction-name-${transaction.id}`}>
          {transactionLabel(transaction, t)}
        </p>
        {showBudget && budget && (
          <p className="text-xs text-muted-foreground truncate">
            {budget.name}
          </p>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            "font-semibold tabular-nums",
            isExpense ? "text-destructive" : "text-success"
          )}
          data-testid={`transaction-amount-${transaction.id}`}
        >
          {isExpense ? "-" : "+"}
          <AnimatedNumber
            value={transaction.amount}
            from={0}
            format={(v) => formatCurrency(v, settings.currency)}
            duration={500}
          />
        </p>
      </div>
    </motion.div>
  );
}

export function TransactionGroup({ date, transactions, onTransactionClick }) {
  const { settings } = useApp();

  const formattedDate = new Intl.DateTimeFormat(
    settings.language === "en" ? "en-US" : `${settings.language}-${settings.language.toUpperCase()}`,
    { weekday: "long", day: "numeric", month: "long" }
  ).format(new Date(date));

  return (
    <div className="mb-4">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {formattedDate}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            onClick={() => onTransactionClick?.(tx)}
          />
        ))}
      </div>
    </div>
  );
}

export default TransactionItem;
