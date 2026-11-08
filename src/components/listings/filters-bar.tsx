"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CONDITIONS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  DEPARTMENT_SHORT_LABELS,
  departmentAccent,
  ITEM_TYPES,
  SIZES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category, Department } from "@/types/db";

interface Props {
  categories: Category[];
  departments: Department[];
  current: Record<string, string | undefined>;
}

export function FiltersBar({ categories, departments, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState(departments);
  const [loadingDepartment, setLoadingDepartment] = useState<Department | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSelectedDepartments(departments), [departments]);
  useEffect(() => setLoadingDepartment(null), [searchKey]);

  function toggleDepartment(department: Department) {
    setLoadingDepartment(department);
    const nextDepartments = selectedDepartments.includes(department)
      ? selectedDepartments.filter((item) => item !== department)
      : [...selectedDepartments, department];
    setSelectedDepartments(nextDepartments);

    const params = new URLSearchParams(window.location.search);
    params.delete("department");
    nextDepartments.forEach((item) => params.append("department", item));
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/browse?${query}` : "/browse", { scroll: false });
  }

  const activeFilterCount = [
    current.category,
    current.item_type,
    current.size,
    current.condition,
    current.min_price,
    current.max_price,
    current.sort && current.sort !== "newest" ? current.sort : undefined,
  ].filter(Boolean).length + selectedDepartments.length;

  return (
    <form
      id="browse-listing-filters"
      method="get"
      action="/browse"
      className="card relative mb-5 p-3.5 sm:p-4"
      aria-label="Filter listings"
    >
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search listings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={current.q ?? ""}
            placeholder="Search uniforms, calculators, shirts…"
            className="input pl-9"
          />
        </label>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className="btn-secondary shrink-0 px-3"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div
        className="scrollbar-hidden -mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        role="group"
        aria-label="Quick filter by department"
      >
        {DEPARTMENTS.map((department) => {
          const selected = selectedDepartments.includes(department);
          const accent = departmentAccent(department);
          return (
            <button
              key={department}
              type="button"
              aria-pressed={selected}
              aria-busy={loadingDepartment === department}
              onClick={() => toggleDepartment(department)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-100 active:scale-[0.98]",
                selected
                  ? accent.badge
                  : `border-line bg-white ${accent.text} hover:bg-brand-50`,
              )}
            >
              <span className="sm:hidden">{DEPARTMENT_SHORT_LABELS[department]}</span>
              <span className="hidden sm:inline">{DEPARTMENT_LABELS[department]}</span>
              {loadingDepartment === department ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : selected ? (
                <X className="h-3.5 w-3.5" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedDepartments.map((department) => (
        <input key={department} type="hidden" name="department" value={department} />
      ))}

      {mounted && filtersOpen && createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm animate-fade-in sm:items-center"
        onClick={() => setFiltersOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-filters-title"
          className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl animate-menu-drop sm:p-5"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="listing-filters-title" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <SlidersHorizontal className="h-5 w-5 text-brand-600" />
              Find your fit
            </h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
              className="rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid max-h-[70dvh] grid-cols-1 gap-2.5 overflow-y-auto sm:max-h-[75dvh] sm:grid-cols-2 lg:grid-cols-3">

        <label>
          <span className="sr-only">Category</span>
          <select form="browse-listing-filters" name="category" defaultValue={current.category ?? ""} className="input">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Item type</span>
          <select form="browse-listing-filters" name="item_type" defaultValue={current.item_type ?? ""} className="input">
            <option value="">Uniforms & equipment</option>
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Size</span>
          <select form="browse-listing-filters" name="size" defaultValue={current.size ?? ""} className="input">
            <option value="">Any size</option>
            {SIZES.filter((size) => size !== "N/A").map((size) => (
              <option key={size} value={size}>
                Size {size}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Condition</span>
          <select form="browse-listing-filters" name="condition" defaultValue={current.condition ?? ""} className="input">
            <option value="">Any condition</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Sort by</span>
          <select form="browse-listing-filters" name="sort" defaultValue={current.sort ?? "newest"} className="input">
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>

        <div className="flex gap-2 sm:col-span-2">
          <input
            form="browse-listing-filters"
            name="min_price"
            type="number"
            min={0}
            placeholder="Min ₱"
            defaultValue={current.min_price ?? ""}
            className="input"
          />
          <input
            form="browse-listing-filters"
            name="max_price"
            type="number"
            min={0}
            placeholder="Max ₱"
            defaultValue={current.max_price ?? ""}
            className="input"
          />
        </div>

        <div className="flex gap-2 pt-2 sm:col-span-2 sm:pt-0 lg:col-span-3">
          <button
            form="browse-listing-filters"
            type="submit"
            onClick={() => setFiltersOpen(false)}
            className="btn-primary flex-1 sm:flex-none"
          >
            Apply filters
          </button>
          <Link href="/browse" onClick={() => setFiltersOpen(false)} className="btn-secondary">
            Clear
          </Link>
        </div>
          </div>
        </div>
      </div>, document.body)}
    </form>
  );
}
