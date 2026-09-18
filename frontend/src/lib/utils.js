import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getInitials(name) {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}
export function calculateBudgetHealth(budget) {
  const total = budget.amount + (budget.carried_over || 0);
  if (total <= 0) return 0;
  
  const remaining = total - (budget.spent || 0);
  const health = (remaining / total) * 100;
  
  return Math.max(0, Math.min(100, health));
}
const BAR_GREEN = { h: 160, s: 55, l: 43 };
const BAR_AMBER = { h: 38, s: 70, l: 52 };
const BAR_RED = { h: 6, s: 66, l: 55 };

export const BAR_FULL_COLOR = `hsl(${BAR_GREEN.h}, ${BAR_GREEN.s}%, ${BAR_GREEN.l}%)`;

export function budgetBarColor(ratio) {
  const r = Math.max(0, Math.min(1, ratio));
  const green = BAR_GREEN;
  const amber = BAR_AMBER;
  const red = BAR_RED;
  const [a, b, t] = r >= 0.5 ? [amber, green, (r - 0.5) / 0.5] : [red, amber, r / 0.5];
  const h = Math.round(a.h + (b.h - a.h) * t);
  const s = Math.round(a.s + (b.s - a.s) * t);
  const l = Math.round(a.l + (b.l - a.l) * t);
  return `hsl(${h}, ${s}%, ${l}%)`;
}
export function getBudgetHealthColor(health) {
  if (health >= 70) return "hsl(var(--success))";
  if (health >= 40) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}
export function getBudgetGradientStyle(health) {
  const percentage = Math.max(0, Math.min(100, health));
  
  if (percentage >= 70) {
    return { backgroundColor: "hsl(var(--success))" };
  } else if (percentage >= 40) {
    return { backgroundColor: "hsl(var(--warning))" };
  } else {
    return { backgroundColor: "hsl(var(--destructive))" };
  }
}
export function formatDate(dateString, locale = "de-DE") {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
export function formatDateTime(dateString, locale = "de-DE") {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
export function getRelativeDate(dateString, t) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return t?.today || "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t?.yesterday || "Yesterday";
  }
  
  return formatDate(dateString);
}
export function groupTransactionsByDate(transactions) {
  const groups = {};
  
  transactions.forEach((tx) => {
    const dateKey = new Date(tx.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: tx.date,
        transactions: [],
      };
    }
    groups[dateKey].transactions.push(tx);
  });
  
  return Object.values(groups).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}
export function shouldResetBudget(budget) {
  if (!budget.last_reset) return false;
  
  const lastReset = new Date(budget.last_reset);
  const now = new Date();
  
  switch (budget.interval) {
    case "daily":
      return now.toDateString() !== lastReset.toDateString();
    case "weekly": {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return lastReset < weekStart;
    }
    case "monthly": {
      return (
        now.getMonth() !== lastReset.getMonth() ||
        now.getFullYear() !== lastReset.getFullYear()
      );
    }
    case "yearly": {
      return now.getFullYear() !== lastReset.getFullYear();
    }
    default:
      return false;
  }
}
export function getIntervalEndDate(startDate, interval) {
  const start = new Date(startDate);
  const end = new Date(start);
  
  switch (interval) {
    case "daily":
      return end;
    case "weekly":
      end.setDate(start.getDate() + 6);
      return end;
    case "monthly":
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      return end;
    case "yearly":
      end.setFullYear(start.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return end;
    default:
      return end;
  }
}
