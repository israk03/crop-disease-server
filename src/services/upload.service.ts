import { cloudinary } from "../config/cloudinary.js";


export type CloudinaryFolder =
  | "avatars"
  | "crop-images"
  | "forum-images"
  | "chat-attachments";

interface UploadOptions {
  width?: number;
  height?: number;
  quality?: number;
}

interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload file buffer to Cloudinary (generic shared service)
 */
export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: CloudinaryFolder,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Invalid file buffer provided");
  }

  return new Promise((resolve, reject) => {
    const transformation: Record<string, unknown>[] = [
      {
        quality: options.quality ?? "auto",
        fetch_format: "auto",
      },
    ];

    if (options.width || options.height) {
      transformation.push({
        width: options.width,
        height: options.height,
        crop: "fill",
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `crop-disease/${folder}`,
        resource_type: "image",
        transformation,
      },
      (error, result) => {
        if (error) {
  console.error("Cloudinary Upload Error:", error);

  return reject(
    new Error(error.message)
  );
}

if (!result) {
  return reject(
    new Error("Cloudinary returned no result")
  );
}

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

/**
 * Delete asset from Cloudinary
 * Safe failure (does not block business flow)
 */
export const deleteFromCloudinary = async (
  publicId: string
): Promise<void> => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", {
      publicId,
      error: err,
    });
  }
};

/**
 * Extract public_id from Cloudinary URL
 * Works even if folder structure changes slightly
 */
export const extractPublicId = (url: string): string => {
  try {
    const withoutQuery = url.split("?")[0];
    const parts = withoutQuery.split("/");

    const uploadIndex = parts.findIndex((p) => p === "upload");
    const publicPath = parts.slice(uploadIndex + 2).join("/");

    return publicPath.replace(/\.[^/.]+$/, "");
  } catch {
    throw new Error("Invalid Cloudinary URL format");
  }
};