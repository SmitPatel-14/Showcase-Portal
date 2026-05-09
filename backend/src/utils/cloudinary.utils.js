import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getResourceType = (fieldName) => {
  if (fieldName === "video") return "video";
  if (fieldName === "ppt" || fieldName === "pdf") return "raw";
  return "image";
};

export const uploadToCloudinary = (localFilePath, folder = "projects", resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        // cleanup tmp file after Cloudinary responds (success or fail)
        fs.unlink(localFilePath, () => {});

        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    fs.createReadStream(localFilePath)
      .on("error", (err) => {
        fs.unlink(localFilePath, () => {});
        reject(err);
      })
      .pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};