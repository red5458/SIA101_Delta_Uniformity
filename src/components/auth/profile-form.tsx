"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  PROGRAMS_BY_DEPARTMENT,
  YEAR_LEVELS,
} from "@/lib/constants";
import type { Department, Profile } from "@/types/db";
import { MAX_PHOTO_BYTES } from "@/lib/constants";

interface CloudinarySignature {
  driver: "cloudinary";
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  uploadUrl: string;
}

interface LocalSignature {
  driver: "local";
  uploadUrl: string;
}

type AvatarSignature = CloudinarySignature | LocalSignature;

async function requestAvatarSignature(file: File): Promise<AvatarSignature> {
  const response = await fetch("/api/uploads/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "Could not prepare the photo upload.");
  }
  return payload.data as AvatarSignature;
}

async function uploadAvatarFile(file: File, signature: AvatarSignature) {
  const body = new FormData();
  if (signature.driver === "cloudinary") {
    body.append("file", file);
    body.append("api_key", signature.apiKey);
    body.append("timestamp", String(signature.timestamp));
    body.append("signature", signature.signature);
    body.append("folder", signature.folder);
    body.append("public_id", signature.publicId);
  } else {
    body.append("photo", file, file.name);
  }

  const response = await fetch(signature.uploadUrl, { method: "POST", body });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Could not upload the profile photo.");
  }

  if (signature.driver === "cloudinary") {
    if (!payload?.secure_url || !payload?.public_id) {
      throw new Error("Cloudinary did not return the uploaded photo.");
    }
    return { url: payload.secure_url as string, key: payload.public_id as string };
  }

  if (!payload?.data?.url || !payload?.data?.key) {
    throw new Error("The server did not return the uploaded photo.");
  }
  return { url: payload.data.url as string, key: payload.data.key as string };
}

export function ProfileForm({
  profile,
  redirectTo,
}: {
  profile: Profile;
  redirectTo?: string;
}) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [department, setDepartment] = useState<Department>(
    profile.department ?? "CSD",
  );
  const [form, setForm] = useState({
    name: profile.name,
    yearLevel: (profile.year_level ?? "1st year") as string,
    program: profile.program ?? PROGRAMS_BY_DEPARTMENT.CSD[0],
    contactEmail: profile.contact_email ?? profile.email,
    contactMobile: profile.contact_mobile ?? "",
    contactMessenger: profile.contact_messenger ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function changeAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("The photo must be 5 MB or smaller.");
      return;
    }

    setAvatarPending(true);
    try {
      const signature = await requestAvatarSignature(file);
      const uploaded = await uploadAvatarFile(file, signature);
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploaded.url, avatarKey: uploaded.key }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not save the profile photo.");
      }
      setAvatarUrl(payload.data.profile.avatar_url);
      toast.success("Profile photo updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the profile photo.");
    } finally {
      setAvatarPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, department }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Could not save profile");
      }
      toast.success("Profile saved");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-brand-50/60 p-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-brand-100 text-brand-700 shadow-sm">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Your profile photo" fill sizes="80px" className="object-cover" />
          ) : (
            <UserRound className="h-9 w-9" />
          )}
          {avatarPending && (
            <span className="absolute inset-0 grid place-items-center bg-ink/45 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Profile photo</p>
          <p className="mt-0.5 text-xs text-muted">JPG, PNG, WebP, or AVIF · up to 5 MB</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={changeAvatar}
            className="sr-only"
            aria-label="Choose a profile photo"
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarPending || pending}
            className="btn-secondary mt-3 px-3 py-2 text-xs"
          >
            {avatarPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {avatarPending ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          className="input"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="yearLevel">
            Year level
          </label>
          <select
            id="yearLevel"
            className="input"
            value={form.yearLevel}
            onChange={(event) => update("yearLevel", event.target.value)}
          >
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>
                {year}
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
            value={department}
            onChange={(event) => {
              const next = event.target.value as Department;
              setDepartment(next);
              update("program", PROGRAMS_BY_DEPARTMENT[next][0]);
            }}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {DEPARTMENT_LABELS[dept]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="program">
          Program
        </label>
        <select
          id="program"
          className="input"
          value={form.program}
          onChange={(event) => update("program", event.target.value)}
        >
          {PROGRAMS_BY_DEPARTMENT[department].map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="contactEmail">
            Contact email
          </label>
          <input
            id="contactEmail"
            type="email"
            className="input"
            value={form.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="contactMobile">
            Mobile number
          </label>
          <input
            id="contactMobile"
            className="input"
            value={form.contactMobile}
            onChange={(event) => update("contactMobile", event.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="contactMessenger">
          Messenger
        </label>
        <input
          id="contactMessenger"
          className="input"
          value={form.contactMessenger}
          onChange={(event) => update("contactMessenger", event.target.value)}
          placeholder="m.me/username or @username"
        />
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
      </button>
    </form>
  );
}
