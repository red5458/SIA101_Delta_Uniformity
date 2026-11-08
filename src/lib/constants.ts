import type {
  Department,
  ListingCondition,
  ListingSize,
  YearLevel,
} from "@/types/db";

export const DEPARTMENTS: Department[] = [
  "CSD",
  "ENGINEERING",
  "NURSING",
  "TECHNOLOGY",
  "EDUCATION",
  "ENTREPRENEURSHIP",
];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  CSD: "Computer Studies",
  ENGINEERING: "Engineering",
  NURSING: "Nursing",
  TECHNOLOGY: "Technology",
  EDUCATION: "Education",
  ENTREPRENEURSHIP: "Entrepreneurship",
};

export const DEPARTMENT_SHORT_LABELS: Record<Department, string> = {
  CSD: "CSD",
  ENGINEERING: "Engineering",
  NURSING: "Nursing",
  TECHNOLOGY: "Tech",
  EDUCATION: "Educ",
  ENTREPRENEURSHIP: "Entrep",
};

export const DEPARTMENT_ACCENTS: Record<Department, { badge: string; dot: string; avatar: string; ring: string; text: string }> = {
  NURSING: {
    badge: "border-green-200 bg-green-50 text-green-800",
    dot: "bg-green-600",
    avatar: "border-green-600",
    ring: "ring-green-600",
    text: "text-green-700",
  },
  TECHNOLOGY: {
    badge: "border-yellow-200 bg-yellow-50 text-yellow-700",
    dot: "bg-yellow-500",
    avatar: "border-yellow-400",
    ring: "ring-yellow-400",
    text: "text-yellow-600",
  },
  EDUCATION: {
    badge: "border-blue-200 bg-blue-50 text-blue-800",
    dot: "bg-blue-600",
    avatar: "border-blue-600",
    ring: "ring-blue-600",
    text: "text-blue-700",
  },
  ENGINEERING: {
    badge: "border-red-200 bg-red-50 text-red-800",
    dot: "bg-red-600",
    avatar: "border-red-600",
    ring: "ring-red-600",
    text: "text-red-700",
  },
  ENTREPRENEURSHIP: {
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    dot: "bg-violet-600",
    avatar: "border-violet-600",
    ring: "ring-violet-600",
    text: "text-violet-700",
  },
  CSD: {
    badge: "border-pink-200 bg-pink-50 text-pink-800",
    dot: "bg-pink-600",
    avatar: "border-pink-600",
    ring: "ring-pink-600",
    text: "text-pink-700",
  },
};

export function departmentAccent(department: Department | null | undefined) {
  return department
    ? DEPARTMENT_ACCENTS[department]
    : {
        badge: "border-line bg-brand-50 text-muted",
        dot: "bg-muted",
        avatar: "border-line",
        ring: "ring-line",
        text: "text-muted",
      };
}

export const PROGRAMS_BY_DEPARTMENT: Record<Department, string[]> = {
  CSD: ["BSIT", "BSCS", "BSIS"],
  ENGINEERING: ["BSCE", "BSCpE", "BSEE", "BSME", "BSCHE"],
  NURSING: ["BSN"],
  TECHNOLOGY: ["BSIndTech", "BTVTE"],
  EDUCATION: ["BEEd", "BSEd", "BPEd"],
  ENTREPRENEURSHIP: ["BS Entrepreneurship"],
};

export const YEAR_LEVELS: YearLevel[] = [
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
];

export const CONDITIONS: ListingCondition[] = ["Like New", "Good", "Fair"];

export const SIZES: ListingSize[] = ["S", "M", "L", "XL", "N/A"];

export const ITEM_TYPES = ["Uniform", "Equipment"] as const;

export const EMAIL_DOMAIN = "@bicol-u.edu.ph";
export const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@bicol-u\.edu\.ph$/;

export const PHOTO_BUCKET = "listing-photos";
export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const PAGE_SIZE = 12;
