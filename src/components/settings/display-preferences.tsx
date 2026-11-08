"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, Accessibility, Sparkles } from "lucide-react";

type Appearance = "light" | "dark" | "system";
type TextSize = "small" | "normal" | "large";

function applyAppearance(choice: Appearance, systemDark: boolean) {
  document.documentElement.dataset.theme = choice === "system" ? (systemDark ? "dark" : "light") : choice;
}

export function DisplayPreferences() {
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const storedAppearance = localStorage.getItem("uniformity:appearance") as Appearance | null;
    const storedSize = localStorage.getItem("uniformity:text-size") as TextSize | null;
    const storedReduceMotion = localStorage.getItem("uniformity:reduce-motion") === "true";
    const nextAppearance = storedAppearance && ["light", "dark", "system"].includes(storedAppearance) ? storedAppearance : "system";
    const nextSize = storedSize && ["small", "normal", "large"].includes(storedSize) ? storedSize : "normal";
    setAppearance(nextAppearance);
    setTextSize(nextSize);
    setReduceMotion(storedReduceMotion);
    document.documentElement.dataset.textSize = nextSize;
    document.documentElement.dataset.reduceMotion = String(storedReduceMotion);

    document.documentElement.dataset.theme = document.documentElement.dataset.theme || "light";
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => applyAppearance(appearance, media.matches);
    updateTheme();
    media.addEventListener("change", updateTheme);
    return () => media.removeEventListener("change", updateTheme);
  }, [appearance]);

  function chooseAppearance(value: Appearance) {
    setAppearance(value);
    localStorage.setItem("uniformity:appearance", value);
    applyAppearance(value, window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function chooseTextSize(value: TextSize) {
    setTextSize(value);
    localStorage.setItem("uniformity:text-size", value);
    document.documentElement.dataset.textSize = value;
  }

  function toggleMotion(value: boolean) {
    setReduceMotion(value);
    localStorage.setItem("uniformity:reduce-motion", String(value));
    document.documentElement.dataset.reduceMotion = String(value);
  }

  const appearances: { value: Appearance; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  const sizes: { value: TextSize; label: string }[] = [
    { value: "small", label: "Small" },
    { value: "normal", label: "Default" },
    { value: "large", label: "Large" },
  ];

  return (
    <section className="card space-y-5 p-4 sm:p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink"><Sun className="h-4 w-4 text-brand-600" /> Appearance</h3>
        <p className="mt-1 text-sm text-muted">Choose a theme for this browser.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {appearances.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" aria-pressed={appearance === value} onClick={() => chooseAppearance(value)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${appearance === value ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line text-muted hover:bg-brand-50/50"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="flex items-center gap-2 font-semibold text-ink"><Accessibility className="h-4 w-4 text-brand-600" /> Text size</h3>
        <p className="mt-1 text-sm text-muted">Adjust reading text across the app.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map(({ value, label }) => (
            <button key={value} type="button" aria-pressed={textSize === value} onClick={() => chooseTextSize(value)} className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${textSize === value ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line text-muted hover:bg-brand-50/50"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-ink"><Sparkles className="h-4 w-4 text-brand-600" /> Reduce animations</h3>
          <p className="mt-1 text-sm text-muted">Limit motion and transitions across the app.</p>
        </div>
        <button type="button" role="switch" aria-checked={reduceMotion} aria-label="Reduce animations" onClick={() => toggleMotion(!reduceMotion)} className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${reduceMotion ? "bg-brand-700" : "bg-slate-300"}`}>
          <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${reduceMotion ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
    </section>
  );
}
