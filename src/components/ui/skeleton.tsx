/**
 * Neutral placeholder block used by route-level `loading.tsx` screens. The
 * shape mimics the content that is about to arrive so navigation feels instant.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-brand-100 ${className}`}
    />
  );
}
