export type Department =
  | "CSD"
  | "ENGINEERING"
  | "NURSING"
  | "TECHNOLOGY"
  | "EDUCATION"
  | "ENTREPRENEURSHIP";

export type YearLevel = "1st year" | "2nd year" | "3rd year" | "4th year";

export type ListingCondition = "Like New" | "Good" | "Fair";

export type ListingSize = "S" | "M" | "L" | "XL" | "N/A";

export type ItemType = "Uniform" | "Equipment";

export type ListingStatus = "Active" | "Sold";

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

export interface SellerProfile extends SellerSummary {
  created_at: string;
}

export interface SellerPageData {
  seller: SellerProfile;
  listings: Listing[];
  stats: { active: number; sold: number };
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
  category?: Pick<Category, "name" | "slug"> | null;
  photos?: ListingPhoto[];
  seller?: SellerSummary | null;
}

export interface Comment {
  comment_id: string;
  listing_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  author?: {
    user_id: string;
    name: string;
    program: string | null;
    year_level: YearLevel | null;
    department?: Department | null;
    avatar_url?: string | null;
  } | null;
}

export interface SellerWishlistSaver {
  wishlist_id: string;
  listing_id: string;
  created_at: string;
  user_id: string;
  name: string;
  department: Department | null;
  program: string | null;
  year_level: YearLevel | null;
  avatar_url: string | null;
}

export type NotificationType =
  | "comment"
  | "reply"
  | "listing_removed"
  | "comment_removed"
  | "suspended"
  | "reinstated";

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_url: string | null;
  listing_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: {
    user_id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface AdminStats {
  total_users: number;
  verified_users: number;
  active_listings: number;
  sold_items: number;
  total_comments: number;
}

export interface FeedFilters {
  department?: Department | Department[];
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
