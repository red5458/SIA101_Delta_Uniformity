import { LoaderCircle } from "lucide-react";

export function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-[55vh] place-items-center"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="relative grid h-14 w-14 place-items-center">
          <span className="absolute inset-0 rounded-full bg-brand-100 animate-pulse" />
          <LoaderCircle className="relative h-9 w-9 animate-spin text-brand-700" />
        </span>
        <span className="text-sm font-medium text-muted">Loading…</span>
      </div>
    </div>
  );
}
