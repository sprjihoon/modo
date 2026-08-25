export type OrderSource = "web" | "app" | "ios" | "android";

export function getOrderSourceBadge(source?: string | null): {
  label: string;
  className: string;
} | null {
  switch ((source ?? "").toLowerCase()) {
    case "web":
      return { label: "웹", className: "bg-sky-100 text-sky-800 border-sky-200" };
    case "ios":
      return { label: "앱 · iOS", className: "bg-slate-100 text-slate-800 border-slate-200" };
    case "android":
      return { label: "앱 · Android", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    case "app":
      return { label: "앱", className: "bg-violet-100 text-violet-800 border-violet-200" };
    default:
      return null;
  }
}

export function getOrderSourceLabel(source?: string | null): string {
  return getOrderSourceBadge(source)?.label ?? "미기록";
}
