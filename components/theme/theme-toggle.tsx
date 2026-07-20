"use client";

import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";

const THEMES: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem("interactive-proof-theme");
    const initial = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const updatePreference = window.setTimeout(() => setPreference(initial), 0);
    applyTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if ((window.localStorage.getItem("interactive-proof-theme") ?? "system") === "system") applyTheme("system");
    };
    media.addEventListener("change", handleChange);
    return () => {
      window.clearTimeout(updatePreference);
      media.removeEventListener("change", handleChange);
    };
  }, []);

  const chooseTheme = (next: ThemePreference) => {
    setPreference(next);
    window.localStorage.setItem("interactive-proof-theme", next);
    applyTheme(next);
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {THEMES.map((theme) => (
        <button
          key={theme.value}
          type="button"
          aria-pressed={preference === theme.value}
          onClick={() => chooseTheme(theme.value)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
