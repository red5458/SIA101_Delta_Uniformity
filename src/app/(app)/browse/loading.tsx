import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <Skeleton className="mb-4 h-14 w-full rounded-2xl" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
