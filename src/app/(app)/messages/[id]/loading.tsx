import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationLoading() {
  return (
    <section className="mx-auto flex h-[calc(100svh-12rem)] min-h-80 max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card md:h-[calc(100svh-9rem)] md:min-h-[28rem]">
      <header className="flex items-center gap-3 border-b border-line px-3 py-3 sm:px-5">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-52 max-w-full" />
        </div>
      </header>

      <div className="flex-1 space-y-3 bg-cream/60 p-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <Skeleton
              className={`h-12 ${index % 2 === 0 ? "w-2/5" : "w-1/2"} rounded-2xl`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      </div>
    </section>
  );
}
