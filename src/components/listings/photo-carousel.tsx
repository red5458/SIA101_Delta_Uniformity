"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoCarousel({
  photos,
  title,
}: {
  photos: { image_url: string; photo_id: string }[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const total = photos.length;

  if (total === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-brand-50 text-sm text-muted">
        No photos provided
      </div>
    );
  }

  const go = (direction: number) =>
    setIndex((value) => (value + direction + total) % total);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-brand-50">
        <div className="relative aspect-[4/3]">
          <Image
            src={photos[index].image_url}
            alt={`${title} photo ${index + 1}`}
            fill
            priority={index === 0}
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover"
          />
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-1 text-xs font-medium text-white">
              {index + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.photo_id}
              type="button"
              onClick={() => setIndex(photoIndex)}
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2",
                photoIndex === index ? "border-brand-600" : "border-transparent",
              )}
              aria-label={`View photo ${photoIndex + 1}`}
            >
              <Image
                src={photo.image_url}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
