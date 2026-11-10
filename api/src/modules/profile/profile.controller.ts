import type { Request, Response } from "express";
import { query } from "../../config/db";
import { toProfile, type UserRow } from "../../types";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { profileSchema } from "./profile.schema";
import { z } from "zod";

export async function updateProfile(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();

  const input = profileSchema.parse(req.body);

  const { rows } = await query<UserRow>(
    `UPDATE users
        SET name = $2,
            year_level = $3,
            department = $4,
            program = $5,
            contact_email = $6,
            contact_mobile = $7,
            contact_messenger = $8
      WHERE user_id = $1
      RETURNING *`,
    [
      current.user_id,
      input.name,
      input.yearLevel,
      input.department,
      input.program,
      input.contactEmail || current.email,
      input.contactMobile,
      input.contactMessenger || null,
    ],
  );

  return ok(res, { saved: true, profile: toProfile(rows[0]!) });
}

export async function updateContactVisibility(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  const { showContactDetails } = z.object({ showContactDetails: z.boolean() }).parse(req.body);
  await query(`UPDATE users SET show_contact_details = $2 WHERE user_id = $1`, [current.user_id, showContactDetails]);
  return ok(res, { showContactDetails });
}

export async function getDeletionRequest(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  const { rows } = await query<{ request_id: string; status: string; requested_at: Date | string }>(
    `SELECT request_id, status, requested_at FROM account_deletion_requests
      WHERE user_id = $1 AND status = 'pending' ORDER BY requested_at DESC LIMIT 1`,
    [current.user_id],
  );
  const request = rows[0];
  return ok(res, request ? { ...request, requested_at: new Date(request.requested_at).toISOString() } : null);
}

export async function requestDeletion(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  await query(
    `INSERT INTO account_deletion_requests (user_id)
     VALUES ($1)
     ON CONFLICT DO NOTHING`,
    [current.user_id],
  );
  return getDeletionRequest(req, res);
}

export async function cancelDeletionRequest(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  await query(
    `UPDATE account_deletion_requests SET status = 'cancelled', resolved_at = now()
      WHERE user_id = $1 AND status = 'pending'`,
    [current.user_id],
  );
  return ok(res, { cancelled: true });
}
