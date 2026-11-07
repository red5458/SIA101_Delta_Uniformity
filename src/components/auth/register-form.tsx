"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  PROGRAMS_BY_DEPARTMENT,
  YEAR_LEVELS,
} from "@/lib/constants";
import type { Department } from "@/types/db";

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [department, setDepartment] = useState<Department>("CSD");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    yearLevel: "1st year",
    program: PROGRAMS_BY_DEPARTMENT.CSD[0],
    contactMobile: "",
    contactMessenger: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          department,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Registration failed");
      }
      toast.success("Check your inbox for the 6-digit code");
      router.push(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          className="input"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="email">
          BU student email
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="juan.delacruz@bicol-u.edu.ph"
          autoComplete="email"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Only <strong>@bicol-u.edu.ph</strong> addresses are accepted.
        </p>
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
          <label className="label" htmlFor="contactMobile">
            Mobile number
          </label>
          <input
            id="contactMobile"
            className="input"
            value={form.contactMobile}
            onChange={(event) => update("contactMobile", event.target.value)}
            placeholder="09XX XXX XXXX"
            autoComplete="tel"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="contactMessenger">
            Messenger (optional)
          </label>
          <input
            id="contactMessenger"
            className="input"
            value={form.contactMessenger}
            onChange={(event) => update("contactMessenger", event.target.value)}
            placeholder="m.me/username or @username"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create account
      </button>

      <p className="text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
