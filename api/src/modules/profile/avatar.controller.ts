import type { Request, Response } from "express";
import { z } from "zod";
import { query } from "../../config/db";
import { userUploadFolder } from "../../config/cloudinary";
import { toProfile, type UserRow } from "../../types";
import { badRequest, unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";

const avatarSchema = z.object({
  avatarUrl: z.string().min(1).max(2048),
  avatarKey: z.string().min(1).max(512),
});

function isOwnedUpload(userId: string, avatarUrl: string, avatarKey: string) {
  const localPrefix = `local:${userId}/`;
  if (avatarKey.startsWith(localPrefix)) {
    const fileName = avatarKey.slice(localPrefix.length);
    return (
      Boolean(fileName) &&
      !fileName.includes("..") &&
      avatarUrl === `/uploads/${userId}/${fileName}`
    );
  }

  if (!avatarKey.startsWith(`${userUploadFolder(userId)}/`)) return false;

  try {
    const url = new URL(avatarUrl);
    const path = decodeURIComponent(url.pathname);
    return (
      url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      path.includes("/image/upload/") &&
      (path.includes(`/${avatarKey}.`) || path.endsWith(`/${avatarKey}`))
    );
  } catch {
    return false;
  }
}

export async function updateAvatar(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const input = avatarSchema.parse(req.body);
  if (!isOwnedUpload(user.user_id, input.avatarUrl, input.avatarKey)) {
    throw badRequest("Choose an image uploaded to your own profile folder.", "INVALID_AVATAR");
  }

  const { rows } = await query<UserRow>(
    `UPDATE users
        SET avatar_url = $2
      WHERE user_id = $1
      RETURNING *`,
    [user.user_id, input.avatarUrl],
  );

  return ok(res, { profile: toProfile(rows[0]!) });
}
