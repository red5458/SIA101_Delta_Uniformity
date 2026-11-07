import type { Request, Response } from "express";
import { query } from "../../config/db";
import { toProfile, type UserRow } from "../../types";
import { unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";
import { profileSchema } from "./profile.schema";

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
