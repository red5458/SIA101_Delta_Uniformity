import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="mb-1 h-6 w-6 rounded-full" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="card flex items-center gap-3 p-3.5 sm:p-4"
          >
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
