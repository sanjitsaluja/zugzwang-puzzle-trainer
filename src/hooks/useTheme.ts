import { useEffect, useMemo, useState } from "react";
import {
  applyThemePreference,
  getNextThemePreference,
  getStoredThemePreference,
  getSystemTheme,
  persistThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface UseThemeResult {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  cyclePreference: () => void;
}

export function useTheme(): UseThemeResult {
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    setResolvedTheme(applyThemePreference(preference));
    persistThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (preference !== "system") return;
      setResolvedTheme(applyThemePreference("system"));
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
  }, [preference]);

  const cyclePreference = useMemo(
    () => () => setPreference((current) => getNextThemePreference(current)),
    [],
  );

  return { preference, resolvedTheme, setPreference, cyclePreference };
}
