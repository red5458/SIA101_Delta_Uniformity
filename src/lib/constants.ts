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
];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  CSD: "Computer Studies",
  ENGINEERING: "Engineering",
  NURSING: "Nursing",
  TECHNOLOGY: "Technology",
  EDUCATION: "Education",
};

export const PROGRAMS_BY_DEPARTMENT: Record<Department, string[]> = {
  CSD: ["BSIT", "BSCS", "BSIS"],
  ENGINEERING: ["BSCE", "BSCpE", "BSEE", "BSME", "BSCHE"],
  NURSING: ["BSN"],
  TECHNOLOGY: ["BSIndTech", "BTVTE"],
  EDUCATION: ["BEEd", "BSEd", "BPEd"],
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
