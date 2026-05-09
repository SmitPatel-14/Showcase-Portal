import multer from "multer";
import path from "path";
import fs from "fs";

const TMP_DIR = "./tmp/uploads";
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg", "image/png", "image/webp",
    "video/mp4", "video/webm",
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  allowedMimes.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

export const projectUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: "cover",       maxCount: 1 },
  { name: "screenshots", maxCount: 5 },
  { name: "ppt",         maxCount: 1 },
  { name: "pdf",         maxCount: 1 },
  { name: "video",       maxCount: 1 },
  { name: "teamPhoto",   maxCount: 1 },
]);