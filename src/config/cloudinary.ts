import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,

  secure: true,
});

cloudinary.api.ping()
  .then(() => {
    console.log("✅ Cloudinary connected");
  })
  .catch((error: Error) => {
    console.error("❌ Cloudinary connection failed:", error.message);
  });

export { cloudinary };