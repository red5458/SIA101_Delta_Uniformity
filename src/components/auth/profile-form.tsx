"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  PROGRAMS_BY_DEPARTMENT,
  YEAR_LEVELS,
} from "@/lib/constants";
import type { Department, Profile } from "@/types/db";

export function ProfileForm({
  profile,
  redirectTo,
}: {
  profile: Profile;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
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
