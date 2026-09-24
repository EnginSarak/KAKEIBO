import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";

const OPTIONS = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light mode" },
  { value: "dark", icon: Moon, label: "Dark mode" },
];

export function ThemeToggle({ className }) {
  const { settings, updateSettings } = useApp();
  const reduce = useReducedMotion();
  const activeIndex = Math.max(0, OPTIONS.findIndex((o) => o.value === settings.theme));

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      data-testid="theme-toggle"
      className={cn(
        "relative inline-flex h-7 flex-shrink-0 items-center rounded-full border border-kbo-line bg-kbo-panel px-1 sm:h-8",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        animate={{ x: `${activeIndex * 100}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
        className="absolute left-1 h-5 w-5 rounded-full bg-kbo-accent shadow-sm sm:h-6 sm:w-6"
      />
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = value === settings.theme;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => updateSettings({ theme: value })}
            data-testid={`theme-option-${value}`}
            className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kbo-accent/60 sm:h-6 sm:w-6"
          >
            <Icon
              className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", active ? "text-kbo-accent-fg" : "text-kbo-muted")}
              strokeWidth={active ? 2.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
