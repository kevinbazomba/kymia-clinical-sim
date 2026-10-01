const DISABLED_KEY = "kymia:pedagogical-reminder-disabled";

export function isPedagogicalReminderDisabled(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(DISABLED_KEY) === "true";
}

export function disablePedagogicalReminder(): void {
  if (typeof window !== "undefined") window.localStorage.setItem(DISABLED_KEY, "true");
}
