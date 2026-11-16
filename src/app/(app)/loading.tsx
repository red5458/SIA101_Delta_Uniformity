import { Skeleton } from "@/components/ui/skeleton";

/** Fallback while any signed-in page loads its data. */
export default function AppLoading() {
  return (
    <div>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card overflow-hidden">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
