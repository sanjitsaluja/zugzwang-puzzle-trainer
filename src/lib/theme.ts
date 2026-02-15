export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "auto") return getSystemTheme();
  return preference;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const root = document.documentElement;
  const resolved = resolveTheme(preference);
  root.setAttribute("data-theme", resolved);

  root.style.colorScheme = resolved;
  return resolved;
}
