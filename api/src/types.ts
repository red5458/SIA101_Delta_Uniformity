export type Department =
  | "CSD"
  | "ENGINEERING"
  | "NURSING"
  | "TECHNOLOGY"
  | "EDUCATION";

export type YearLevel = "1st year" | "2nd year" | "3rd year" | "4th year";

export type ListingCondition = "Like New" | "Good" | "Fair";

export type ListingSize = "S" | "M" | "L" | "XL" | "N/A";

export type ItemType = "Uniform" | "Equipment";

export type ListingStatus = "Active" | "Sold";

/** Raw database row. Snake_case is kept so the API contract matches the app. */
export interface UserRow {
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
  year_level: YearLevel | null;
  department: Department | null;
  program: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  contact_email: string | null;
  contact_mobile: string | null;
  contact_messenger: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  user_id: string;
  name: string;
  email: string;
  year_level: YearLevel | null;
  department: Department | null;
  program: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  contact_email: string | null;
  contact_mobile: string | null;
  contact_messenger: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
}

export interface ListingPhoto {
  photo_id: string;
  listing_id: string;
  image_url: string;
  cloudinary_id: string;
  position: number;
}

export interface SellerSummary {
  user_id: string;
  name: string;
  program: string | null;
  year_level: YearLevel | null;
  department: Department | null;
  contact_email: string | null;
  contact_mobile: string | null;
  contact_messenger: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export interface Listing {
  listing_id: string;
  seller_id: string;
  category_id: string;
  title: string;
  item_type: ItemType;
  description: string;
  price: number;
  condition: ListingCondition;
  size: ListingSize;
  measurements: string | null;
  department: Department;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  category: Pick<Category, "name" | "slug"> | null;
  photos: ListingPhoto[];
  seller: SellerSummary | null;
}

export interface CommentRow {
  comment_id: string;
  listing_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  author: {
    user_id: string;
    name: string;
    program: string | null;
    year_level: YearLevel | null;
  } | null;
}

export interface AdminStats {
  total_users: number;
  verified_users: number;
  active_listings: number;
  sold_items: number;
  total_comments: number;
}

export interface FeedFilters {
  department?: Department;
  category?: string;
  itemType?: ItemType;
  size?: ListingSize;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  q?: string;
  page?: number;
}

export function toProfile(user: UserRow): Profile {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    year_level: user.year_level,
    department: user.department,
    program: user.program,
    is_verified: user.is_verified,
    is_admin: user.is_admin,
    is_suspended: user.is_suspended,
    contact_email: user.contact_email,
    contact_mobile: user.contact_mobile,
    contact_messenger: user.contact_messenger,
    avatar_url: user.avatar_url,
    created_at: user.created_at.toISOString(),
  };
}

export function isActiveProfile(user: UserRow): boolean {
  return Boolean(
    user.is_verified &&
      !user.is_suspended &&
      user.year_level &&
      user.department &&
      user.program,
  );
}
