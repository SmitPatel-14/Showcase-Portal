import Project from "../models/project.model.js";
import { BadRequestError } from "../utils/Apierrors.utils.js";
import { uploadToCloudinary } from "../utils/cloudinary.utils.js";
import fs from "fs";


// helper — cleans up all tmp files if something fails mid-upload
const cleanupTmpFiles = (files) => {
  if (!files) return;
  Object.values(files).forEach((fileArr) =>
    fileArr.forEach((f) => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    })
  );
};

export const addProject = async (req, res) => {
  const files = req.files;

  try {
    const {
      title,
      shortDescription,
      fullDescription,
      category,
      academicYear,
      semester,
      techStack,       // sent as JSON string: '["React","Node"]' or comma separated
      githubUrl,
      liveUrl,
      members,         // sent as JSON string: '["userId1","userId2"]'
      presentedAt,     // sent as JSON string: '[{"eventName":"SIH","award":"1st"}]'
    } = req.body;
    
    if (!title || !shortDescription || !fullDescription || !academicYear || !semester || !githubUrl) {
      throw new BadRequestError("Missing required fields: title, shortDescription, fullDescription, academicYear, semester, githubUrl");
    }
    // ── Parse JSON fields ──────────────────────────────────
    const parsedTechStack = typeof techStack === "string"
      ? JSON.parse(techStack)
      : techStack ?? [];

    const parsedMembers = members
      ? typeof members === "string" ? JSON.parse(members) : members
      : [];

    const parsedPresentedAt = presentedAt
      ? typeof presentedAt === "string" ? JSON.parse(presentedAt) : presentedAt
      : [];

    // ── Upload media to Cloudinary ─────────────────────────
    const media = {};
    // if (!files?.cover?.[0]) {
    //   throw new BadRequestError("Cover image is required");
    // }

    if (files?.cover?.[0]) {
      media.cover = await uploadToCloudinary(files.cover[0].path, "projects/covers");
    }

    if (files?.screenshots?.length) {
      media.screenshots = await Promise.all(
        files.screenshots.map((f) => uploadToCloudinary(f.path, "projects/screenshots"))
      );
    }

    if (files?.ppt?.[0]) {
      media.ppt = await uploadToCloudinary(files.ppt[0].path, "projects/ppts");
    }

    if (files?.pdf?.[0]) {
      media.pdf = await uploadToCloudinary(files.pdf[0].path, "projects/pdfs");
    }

    if (files?.video?.[0]) {
      media.video = await uploadToCloudinary(files.video[0].path, "projects/videos");
    }

    // ── Create project ─────────────────────────────────────
    const project = await Project.create({
      title,
      shortDescription,
      fullDescription,
      category,
      academicYear,
      semester: Number(semester),
      techStack: parsedTechStack,
      githubUrl,
      liveUrl,
      ...media,                        // spread cover, screenshots, ppt, pdf, video
      owner: req.user.id,             // from auth middleware
      members: parsedMembers,
      presentedAt: parsedPresentedAt,
    });

    return res.status(201).json({
      success: true,
      message: "Project submitted successfully",
      data: project,
    });

  } catch (error) {
    cleanupTmpFiles(files); // delete tmp files if upload/db fails
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};