import type { Request, Response } from "express";
import { query } from "../../config/db";
import { toProfile, type UserRow } from "../../types";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { clearAuthCookies } from "../auth/auth.cookies";
import { deleteAccountSchema, onboardingSchema, profileSchema } from "./profile.schema";
import { deleteAccount } from "./profile.service";
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

export async function updateOnboarding(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  const { completed } = onboardingSchema.parse(req.body);

  const { rows } = await query<UserRow>(
    `UPDATE users
        SET onboarding_completed_at = CASE WHEN $2 THEN now() ELSE NULL END,
            updated_at = now()
      WHERE user_id = $1
      RETURNING *`,
    [current.user_id, completed],
  );

  return ok(res, { profile: toProfile(rows[0]!) });
}

export async function deleteAccountHandler(req: Request, res: Response) {
  const current = req.user;
  if (!current) throw unauthorized();
  const { password } = deleteAccountSchema.parse(req.body);

  await deleteAccount(current, password);
  clearAuthCookies(res);

  return ok(res, { deleted: true });
}
