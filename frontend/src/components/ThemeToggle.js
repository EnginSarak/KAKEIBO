import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { cn } from "../lib/utils";
import { useApp } from "../context/AppContext";

export function ThemeToggle({ className }) {
  const { resolvedTheme, toggleTheme } = useApp();
  const reduce = useReducedMotion();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Light mode" : "Dark mode"}
      data-testid="theme-toggle"
      className={cn(
        "relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border border-kbo-line bg-kbo-panel px-1",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kbo-accent/60",
        className
      )}
    >
      <Sun className="absolute left-[7px] h-3.5 w-3.5 text-kbo-muted" strokeWidth={2} />
      <Moon className="absolute right-[7px] h-3.5 w-3.5 text-kbo-muted" strokeWidth={2} />
      <motion.span
        layout={!reduce}
        animate={{ x: isDark ? 24 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
        className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-kbo-accent shadow-sm"
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-kbo-accent-fg" strokeWidth={2.5} />
        ) : (
          <Sun className="h-3.5 w-3.5 text-kbo-accent-fg" strokeWidth={2.5} />
        )}
      </motion.span>
    </button>
  );
}

export default ThemeToggle;
