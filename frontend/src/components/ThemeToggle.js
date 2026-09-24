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
        "relative inline-flex h-9 flex-shrink-0 items-center rounded-full border border-kbo-line bg-kbo-panel px-1 max-[359px]:h-8 sm:h-8",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        animate={{ x: `${activeIndex * 100}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
        className="absolute left-1 h-7 w-7 rounded-full bg-kbo-accent shadow-sm max-[359px]:h-6 max-[359px]:w-6 sm:h-6 sm:w-6"
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
            className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kbo-accent/60 max-[359px]:h-6 max-[359px]:w-6 sm:h-6 sm:w-6"
          >
            <Icon
              className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", active ? "text-kbo-accent-fg" : "text-kbo-muted")}
              strokeWidth={active ? 2.5 : 2}
            />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeToggle;
