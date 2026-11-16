import { Skeleton } from "@/components/ui/skeleton";

export default function ListingDetailLoading() {
  return (
    <div>
      <Skeleton className="mb-3 h-9 w-32 rounded-xl" />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />

        <div className="space-y-4">
          <div className="card space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="card space-y-3 p-4 sm:p-5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
