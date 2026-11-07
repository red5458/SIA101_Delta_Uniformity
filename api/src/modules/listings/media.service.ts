import { unlink } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import {
  cloudinaryConfig,
  cloudinaryConfigured,
  localUploadsDir,
} from "../../config/cloudinary";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

/**
 * Best-effort cleanup. The database row is the source of truth; a failed
 * destroy must never fail the user's request. Only ids inside the app folder
 * are eligible, so a malformed row cannot delete unrelated Cloudinary assets.
 */
export async function destroyCloudinaryAssets(publicIds: string[]) {
  if (!cloudinaryConfigured()) return;

  const eligible = Array.from(
    new Set(
      publicIds.filter(
        (id) => typeof id === "string" && id.startsWith("uniformity/"),
      ),
    ),
  );
  if (eligible.length === 0) return;

  cloudinary.config(cloudinaryConfig());

  await Promise.all(
    eligible.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { invalidate: true }).catch((error) => {
        logger.warn({ err: error, publicId }, "Cloudinary asset cleanup failed");
      }),
    ),
  );
}

/** Development-only counterpart for photos stored on local disk. */
export async function destroyLocalAssets(keys: string[]) {
  if (env.uploadDriver !== "local") return;

  const root = path.resolve(localUploadsDir());

  await Promise.all(
    keys.map(async (key) => {
      if (!key.startsWith("local:")) return;

      const target = path.resolve(root, key.slice("local:".length));
      // Never unlink outside the uploads folder, even with a malformed row.
      if (!target.startsWith(root + path.sep)) return;

      await unlink(target).catch(() => {
        // Already gone or never written — nothing to clean up.
      });
    }),
  );
}

export async function destroyStoredAssets(keys: string[]) {
  await Promise.all([destroyCloudinaryAssets(keys), destroyLocalAssets(keys)]);
}
