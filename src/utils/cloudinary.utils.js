import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// configure once — call this in your app entry point
export const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// upload a single file from disk, returns { url, publicId }
export const uploadToCloudinary = async (localFilePath, folder = "projects") => {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder,
    resource_type: "auto", // handles image, video, pdf, ppt
  });

  fs.unlinkSync(localFilePath); // delete temp file after upload

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

// delete a file from cloudinary using publicId
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};