"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  CONDITIONS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  ITEM_TYPES,
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  SIZES,
} from "@/lib/constants";
import type { Category, Department, Listing } from "@/types/db";

interface PhotoValue {
  url: string;
  key: string;
}

interface CloudinarySignature {
  driver: "cloudinary";
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
}

interface LocalSignature {
  driver: "local";
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
}

type UploadSignature = CloudinarySignature | LocalSignature;

interface ListingFormProps {
  categories: Category[];
  initial?: Listing;
}

/**
 * Asks the API for a short-lived Cloudinary signature. The file goes straight
 * from the browser to Cloudinary, so the Express server never buffers a 5 MB
 * image and the upload cannot escape the student's own folder.
 *
 * In local development the API answers with `driver: "local"` and the browser
 * posts to the multipart fallback instead.
 */
async function requestSignature(file: File): Promise<UploadSignature> {
  const response = await fetch("/api/uploads/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new Error(
      payload?.error?.message ?? "Photo uploads are unavailable right now.",
    );
  }
  return payload.data as UploadSignature;
}

async function uploadToCloudinary(
  file: Blob,
  signature: CloudinarySignature,
): Promise<PhotoValue> {
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("signature", signature.signature);
  body.append("folder", signature.folder);
  body.append("public_id", signature.publicId);

  const response = await fetch(signature.uploadUrl, { method: "POST", body });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.secure_url || !payload?.public_id) {
    throw new Error(
      payload?.error?.message ?? "Cloudinary rejected the upload.",
    );
  }

  return { url: payload.secure_url as string, key: payload.public_id as string };
}

async function uploadLocally(
  file: Blob,
  signature: LocalSignature,
): Promise<PhotoValue> {
  const body = new FormData();
  body.append("photo", file, file instanceof File ? file.name : "photo.jpg");

  const response = await fetch(signature.uploadUrl, { method: "POST", body });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.url) {
    throw new Error(payload?.error?.message ?? "Could not store the photo.");
  }

  return { url: payload.data.url as string, key: payload.data.key as string };
}

export function ListingForm({ categories, initial }: ListingFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<PhotoValue[]>(
    [...(initial?.photos ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({ url: photo.image_url, key: photo.cloudinary_id })),
  );

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    categoryId: initial?.category_id ?? categories[0]?.category_id ?? "",
    itemType: initial?.item_type ?? "Uniform",
    condition: initial?.condition ?? "Good",
    size: initial?.size ?? "M",
    measurements: initial?.measurements ?? "",
    department: (initial?.department ?? "CSD") as Department,
    price: initial ? String(initial.price) : "",
    description: initial?.description ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setUploading(true);
    try {
      // Load the compressor only when a file is picked; it stays out of the
      // initial page bundle.
      const { default: imageCompression } = await import(
        "browser-image-compression"
      );

      const uploads: PhotoValue[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image.`);
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          toast.error(`${file.name} is larger than 5MB.`);
          continue;
        }

        try {
          const signature = await requestSignature(file);
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.7,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
          });
          uploads.push(
            signature.driver === "local"
              ? await uploadLocally(compressed, signature)
              : await uploadToCloudinary(compressed, signature),
          );
        } catch (error) {
          // Auth/configuration problems affect every file, so stop after the
          // first failure instead of repeating the same toast.
          toast.error(
            error instanceof Error
              ? error.message
              : `Could not upload ${file.name}.`,
          );
          break;
        }
      }

      if (uploads.length > 0) {
        setPhotos((prev) => [...prev, ...uploads].slice(0, MAX_PHOTOS));
        toast.success(`${uploads.length} photo${uploads.length > 1 ? "s" : ""} uploaded`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (photos.length === 0) {
      toast.error("Add at least one photo so buyers know what they are getting.");
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title,
      categoryId: form.categoryId,
      itemType: form.itemType,
      condition: form.condition,
      size: form.size,
      measurements: form.measurements,
      department: form.department,
      price: Number(form.price),
      description: form.description,
      photos,
    };

    try {
      const response = await fetch(
        initial ? `/api/listings/${initial.listing_id}` : "/api/listings",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Could not save the listing.");
      }

      toast.success(initial ? "Listing updated" : "Listing published");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-4 sm:p-6">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input"
          value={form.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Engineering uniform, size M"
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="itemType">
            Item type
          </label>
          <select
            id="itemType"
            className="input"
            value={form.itemType}
            onChange={(event) =>
              set("itemType", event.target.value as typeof form.itemType)
            }
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select
            id="categoryId"
            className="input"
            value={form.categoryId}
            onChange={(event) => set("categoryId", event.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="department">
            Department
          </label>
          <select
            id="department"
            className="input"
            value={form.department}
            onChange={(event) =>
              set("department", event.target.value as Department)
            }
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {DEPARTMENT_LABELS[dept]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="condition">
            Condition
          </label>
          <select
            id="condition"
            className="input"
            value={form.condition}
            onChange={(event) =>
              set("condition", event.target.value as typeof form.condition)
            }
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="size">
            Size
          </label>
          <select
            id="size"
            className="input"
            value={form.size}
            onChange={(event) => set("size", event.target.value as typeof form.size)}
          >
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="price">
            Price (₱)
          </label>
          <input
            id="price"
            type="number"
            min={0}
            max={100000}
            step="0.01"
            className="input"
            value={form.price}
            onChange={(event) => set("price", event.target.value)}
            placeholder="450"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="measurements">
          Measurements (optional)
        </label>
        <input
          id="measurements"
          className="input"
          value={form.measurements}
          onChange={(event) => set("measurements", event.target.value)}
          placeholder="Chest: 19.5 in, Length: 26 in"
          maxLength={200}
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className="input min-h-28 resize-y"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Condition details, flaws, meetup preferences…"
          required
          maxLength={5000}
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="label !mb-0">Photos ({photos.length}/{MAX_PHOTOS})</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || photos.length >= MAX_PHOTOS}
            className="btn-secondary text-xs"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Add photos"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => handleFiles(event.target.files)}
        />

        {photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={photo.key}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line"
              >
                <Image
                  src={photo.url}
                  alt={`Upload ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((item) => item.key !== photo.key))
                  }
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-600 opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 grid w-full place-items-center rounded-xl border border-dashed border-line bg-brand-50/40 px-4 py-8 text-center text-sm text-muted"
          >
            <ImagePlus className="mb-2 h-6 w-6 text-brand-500" />
            Tap to upload up to {MAX_PHOTOS} photos
          </button>
        )}
      </div>

      <div className="flex gap-2 border-t border-line pt-4">
        <button type="submit" disabled={saving || uploading} className="btn-primary flex-1">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {initial ? "Save changes" : "Publish listing"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
