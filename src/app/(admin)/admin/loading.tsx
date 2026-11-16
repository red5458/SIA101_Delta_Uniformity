import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-32 max-w-full" />
          </div>
        ))}
      </div>

      <div className="card mt-5 space-y-3 p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
