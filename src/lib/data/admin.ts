import "server-only";

import { apiFetch } from "@/lib/api/server";
import type { AdminStats } from "@/types/db";

export interface AdminListingRow {
  listing_id: string;
  title: string;
  price: number;
  status: string;
  department: string;
  created_at: string;
  seller: { name: string; email: string } | null;
  photos: { image_url: string; cloudinary_id: string }[];
}

export interface AdminUserRow {
  user_id: string;
  name: string;
  email: string;
  program: string | null;
  department: string | null;
  year_level: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface AdminCommentRow {
  comment_id: string;
  text: string;
  created_at: string;
  listing_id: string;
  author: { name: string } | null;
  listing: { title: string } | null;
}

export interface AccountDeletionRequestRow {
  request_id: string;
  user_id: string;
  name: string;
  email: string;
  requested_at: string;
}

export function getAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/admin/stats");
}

export function listAdminListings(): Promise<AdminListingRow[]> {
  return apiFetch<AdminListingRow[]>("/admin/listings");
}

export function listAdminUsers(): Promise<AdminUserRow[]> {
  return apiFetch<AdminUserRow[]>("/admin/users");
}

export function listAdminComments(): Promise<AdminCommentRow[]> {
  return apiFetch<AdminCommentRow[]>("/admin/comments");
}

export function listAccountDeletionRequests(): Promise<AccountDeletionRequestRow[]> {
  return apiFetch<AccountDeletionRequestRow[]>("/admin/account-deletion-requests");
}
