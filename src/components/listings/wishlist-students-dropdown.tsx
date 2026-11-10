"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, ChevronDown, LoaderCircle } from "lucide-react";

interface WishlistStudent {
  user_id: string;
  name: string;
  department: string | null;
  program: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function WishlistStudentsDropdown({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [students, setStudents] = useState<WishlistStudent[]>([]);

  async function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || loaded || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/wishlist/listing/${listingId}/students`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load wishlist students.");
      setStudents(Array.isArray(payload?.data) ? payload.data : []);
      setLoaded(true);
    } catch {
      // Allow retry the next time the dropdown is opened.
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-brand-50/60 active:scale-[0.99]"
      >
        <span className="inline-flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-brand-600" />
          Students who saved this listing
          {loaded && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{students.length}</span>}
        </span>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin text-brand-600" /> : <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && !loading && (
        <div className="max-h-64 overflow-y-auto border-t border-line p-2">
          {students.length ? students.map((student) => (
            <Link
              key={student.user_id}
              href={`/students/${student.user_id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-brand-50/60"
            >
              <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                {student.avatar_url ? <Image src={student.avatar_url} alt="" fill sizes="36px" className="object-cover" /> : student.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{student.name}</span>
                {(student.program || student.department) && <span className="block truncate text-xs text-muted">{[student.program, student.department].filter(Boolean).join(" · ")}</span>}
              </span>
            </Link>
          )) : (
            <p className="px-2 py-4 text-center text-sm text-muted">No students have saved this listing yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
