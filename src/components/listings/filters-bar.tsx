"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CONDITIONS, DEPARTMENTS, DEPARTMENT_LABELS, ITEM_TYPES, SIZES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/db";

interface Props {
  categories: Category[];
  current: Record<string, string | undefined>;
}

export function FiltersBar({ categories, current }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    current.department,
    current.category,
    current.item_type,
    current.size,
    current.condition,
    current.min_price,
    current.max_price,
    current.sort && current.sort !== "newest" ? current.sort : undefined,
  ].filter(Boolean).length;

  return (
    <form
      method="get"
      action="/browse"
      className="card relative mb-5 p-3.5 sm:grid sm:grid-cols-4 sm:gap-2.5 sm:p-4"
      aria-label="Filter listings"
    >
      <div className="hidden items-center gap-2 text-sm font-semibold text-ink sm:col-span-4 sm:flex">
        <SlidersHorizontal className="h-4 w-4 text-brand-600" />
        Find your fit
      </div>

      <div className="flex gap-2 sm:col-span-2">
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
          className="btn-secondary shrink-0 px-3 sm:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="sr-only">Open filters</span>
          {activeFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div
        className={cn(
          filtersOpen
            ? "fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:static sm:contents sm:bg-transparent sm:p-0"
            : "hidden sm:contents",
        )}
        onClick={() => setFiltersOpen(false)}
      >
        <div
          role={filtersOpen ? "dialog" : undefined}
          aria-modal={filtersOpen ? "true" : undefined}
          aria-labelledby={filtersOpen ? "listing-filters-title" : undefined}
          className="w-full rounded-2xl bg-white p-4 shadow-xl sm:contents"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between sm:hidden">
            <h2 id="listing-filters-title" className="font-display text-lg font-bold text-ink">
              Filters
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

          <div className="grid max-h-[70dvh] grid-cols-1 gap-2.5 overflow-y-auto sm:contents sm:max-h-none sm:overflow-visible sm:grid-cols-2 lg:grid-cols-4">

        <label>
          <span className="sr-only">Department</span>
          <select name="department" defaultValue={current.department ?? ""} className="input">
            <option value="">All departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {DEPARTMENT_LABELS[dept]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Category</span>
          <select name="category" defaultValue={current.category ?? ""} className="input">
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
          <select name="item_type" defaultValue={current.item_type ?? ""} className="input">
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
          <select name="size" defaultValue={current.size ?? ""} className="input">
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
          <select name="condition" defaultValue={current.condition ?? ""} className="input">
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
          <select name="sort" defaultValue={current.sort ?? "newest"} className="input">
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>

        <div className="flex gap-2 sm:col-span-2">
          <input
            name="min_price"
            type="number"
            min={0}
            placeholder="Min ₱"
            defaultValue={current.min_price ?? ""}
            className="input"
          />
          <input
            name="max_price"
            type="number"
            min={0}
            placeholder="Max ₱"
            defaultValue={current.max_price ?? ""}
            className="input"
          />
        </div>

        <div className="flex gap-2 pt-2 sm:col-span-2 sm:pt-0 lg:col-span-4">
          <button
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
      </div>
    </form>
  );
}
