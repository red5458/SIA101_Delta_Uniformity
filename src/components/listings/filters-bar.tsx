import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { CONDITIONS, DEPARTMENTS, DEPARTMENT_LABELS, ITEM_TYPES, SIZES } from "@/lib/constants";
import type { Category } from "@/types/db";

interface Props {
  categories: Category[];
  current: Record<string, string | undefined>;
}

export function FiltersBar({ categories, current }: Props) {
  return (
    <form
      method="get"
      action="/browse"
      className="card mb-5 p-3.5 sm:p-4"
      aria-label="Filter listings"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <SlidersHorizontal className="h-4 w-4 text-brand-600" />
        Find your fit
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative sm:col-span-2">
          <span className="sr-only">Search listings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={current.q ?? ""}
            placeholder="Search uniforms, calculators, shirts…"
            className="input pl-9"
          />
        </label>

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

        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary flex-1 sm:flex-none">
            Apply filters
          </button>
          <Link href="/browse" className="btn-secondary">
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}
