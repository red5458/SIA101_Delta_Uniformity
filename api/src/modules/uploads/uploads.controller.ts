import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env";
import {
  cloudinaryConfig,
  cloudinaryConfigured,
  localUploadsDir,
  userUploadFolder,
} from "../../config/cloudinary";
import { ApiError, unauthorized } from "../../utils/ApiError";
import { ok } from "../../utils/http";

const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"];

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function safeBaseName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-60) || "photo"
  );
}

function extensionFor(file: Express.Multer.File) {
  const fromName = path.extname(file.originalname).slice(1).toLowerCase();
  if (ALLOWED_FORMATS.includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;

  const fromMime = file.mimetype.split("/")[1]?.toLowerCase();
  if (fromMime === "jpeg") return "jpg";
  if (fromMime && ALLOWED_FORMATS.includes(fromMime)) return fromMime;
  return "jpg";
}

/**
 * Returns the exact parameters the browser must echo to Cloudinary. The file
 * never passes through this server, so there is no 4.5 MB body limit and no
 * temporary disk usage. The signature scopes the upload to the caller's folder.
 *
 * In local development (no Cloudinary keys) the browser is told to post to the
 * multipart fallback instead so the app remains fully testable offline.
 */
export async function signatureHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  if (env.uploadDriver === "local") {
    return ok(res, {
      driver: "local",
      uploadUrl: "/api/uploads/direct",
      maxBytes: MAX_PHOTO_BYTES,
      allowedFormats: ALLOWED_FORMATS,
    });
  }

  if (!cloudinaryConfigured()) {
    throw new ApiError(
      503,
      "Photo uploads are not configured yet. Set the Cloudinary environment variables.",
      "UPLOADS_DISABLED",
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = userUploadFolder(user.user_id);
  const publicId = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeBaseName(
    String(req.body?.fileName ?? "photo"),
  )}`;

  const signature = cloudinary.utils.api_sign_request(
    { folder, public_id: publicId, timestamp },
    env.CLOUDINARY_API_SECRET!,
  );

  return ok(res, {
    driver: "cloudinary",
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    maxBytes: MAX_PHOTO_BYTES,
    allowedFormats: ALLOWED_FORMATS,
  });
}

/** Development-only disk storage. Never used when Cloudinary is configured. */
async function storeLocally(userId: string, file: Express.Multer.File) {
  const directory = path.join(localUploadsDir(), userId);
  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extensionFor(file)}`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), file.buffer);

  return {
    url: `/uploads/${userId}/${fileName}`,
    key: `local:${userId}/${fileName}`,
  };
}

/**
 * Server-side fallback for environments where direct upload is blocked, and the
 * storage path for local development. Kept intentionally thin — direct signed
 * upload is the production path.
 */
export async function directUploadHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) throw unauthorized();

  const file = req.file;
  if (!file) throw new ApiError(422, "Attach an image in the photo field.", "NO_FILE");
  if (!file.mimetype.startsWith("image/")) {
    throw new ApiError(422, "Only image files are accepted.", "INVALID_TYPE");
  }

  if (env.uploadDriver === "local") {
    const stored = await storeLocally(user.user_id, file);
    return ok(res, { ...stored, position: 0 });
  }

  if (!cloudinaryConfigured()) {
    throw new ApiError(
      503,
      "Photo uploads are not configured yet.",
      "UPLOADS_DISABLED",
    );
  }

  cloudinary.config(cloudinaryConfig());

  const folder = userUploadFolder(user.user_id);
  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "image", allowed_formats: ALLOWED_FORMATS },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({
            secure_url: uploaded.secure_url,
            public_id: uploaded.public_id,
          });
        },
      );
      stream.end(file.buffer);
    },
  );

  return ok(res, {
    url: result.secure_url,
    key: result.public_id,
    position: 0,
  });
}
