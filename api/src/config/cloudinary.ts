import path from "node:path";
import { env } from "./env";

export function cloudinaryConfigured(): boolean {
  return env.cloudinaryEnabled;
}

export function cloudinaryConfig() {
  if (!env.cloudinaryEnabled) {
    throw new Error("Cloudinary is not configured");
  }
  return {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  };
}

/** Folder that owns every upload for a student. Must match the validator. */
export function userUploadFolder(userId: string): string {
  return `uniformity/${userId}`;
}

/**
 * Local development storage lives inside the Next.js `public` folder so both
 * the Express API and the frontend can serve the same files.
 */
export function localUploadsDir(): string {
  return path.join(env.publicDir, "uploads");
}
