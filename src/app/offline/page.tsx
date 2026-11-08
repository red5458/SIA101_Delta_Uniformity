import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export const metadata = { title: "Offline | Uniformity" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-svh place-items-center bg-cream px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <CloudOff className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">
          You are offline
        </h1>
        <p className="mt-1 text-sm text-muted">
          Uniformity needs a connection to load listings, questions, and your
          notifications. Check your data or Wi-Fi and try again.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/browse" className="btn-primary text-sm">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Link>
          <Link href="/" className="btn-secondary text-sm">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
