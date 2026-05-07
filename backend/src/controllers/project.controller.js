import Project from "../models/project.model.js";
import { BadRequestError } from "../utils/Apierrors.utils.js";
import { uploadToCloudinary } from "../utils/cloudinary.utils.js";
import { cleanupTmpFiles } from "../utils/cleanup.helpers.js";
import { PROJECT_STATUS,SCREENSHOTS_LIMIT } from "../constant/enums.contant.js";
import next from "next";

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
      techStack, 
      githubUrl,
      liveUrl,
      members, 
      presentedAt, 
    } = req.body;

    if (
      !title ||
      !shortDescription ||
      !fullDescription ||
      !academicYear ||
      !semester ||
      !githubUrl
    ) {
      throw new BadRequestError(
        "Missing required fields: title, shortDescription, fullDescription, academicYear, semester, githubUrl",
      );
    }
    const existingProject = await Project.findOne({
      title: title.trim(),
    });
    if (existingProject) {
      throw new BadRequestError("Project with this title already exists");
    }
    const parsedTechStack =
      typeof techStack === "string" ? JSON.parse(techStack) : (techStack ?? []);

    const parsedMembers = members
      ? typeof members === "string"
        ? JSON.parse(members)
        : members
      : [];

    const parsedPresentedAt = presentedAt
      ? typeof presentedAt === "string"
        ? JSON.parse(presentedAt)
        : presentedAt
      : [];

    const media = {};
    if (!files?.cover?.[0]) {
      throw new BadRequestError("Cover image is required");
    }
    else{
      media.cover = await uploadToCloudinary(
        files.cover[0].path,
        "projects/covers",
      );
    }

    if (files?.screenshots?.length) {
      media.screenshots = await Promise.all(
        files.screenshots.map((f) =>
          uploadToCloudinary(f.path, "projects/screenshots"),
        ),
      );
    }

    if (files?.ppt?.[0]) {
      media.ppt = await uploadToCloudinary(files.ppt[0].path, "projects/ppts");
    }

    if (files?.pdf?.[0]) {
      media.pdf = await uploadToCloudinary(files.pdf[0].path, "projects/pdfs");
    }

    if (files?.video?.[0]) {
      media.video = await uploadToCloudinary(
        files.video[0].path,
        "projects/videos",
      );
    }

    if (files?.teamPhoto?.[0]) {
      media.teamPhoto = await uploadToCloudinary(
        files.teamPhoto[0].path,
        "projects/team",
      );
    }

    // create project document in DB
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
      ...media, 
      owner: req.user.id, 
      members: parsedMembers,
      presentedAt: parsedPresentedAt,
    });

    //TODO: trigger notification to admins/faculty for review (build notification module later)

    return res.status(201).json({
      success: true,
      message: "Project submitted successfully",
      data: project,
    });
  } catch (error) {
    cleanupTmpFiles(files); 
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};


//review controller for admin/faculty
export const reviewProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, feedback } = req.body;

    // validate input
    if (![PROJECT_STATUS.APPROVED, PROJECT_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved' or 'rejected'",
      });
    }

    if (status === PROJECT_STATUS.REJECTED && !feedback?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback is required when rejecting a project",
      });
    }

    const project = await Project.findById(projectId);

    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.status !== PROJECT_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Project is already ${project.status}`,
      });
    }

    project.status = status;
    project.reviewedBy = req.user._id;
    project.reviewedAt = new Date();
    project.feedback = status === PROJECT_STATUS.REJECTED ? feedback.trim() : "";

    await project.save();

    // TODO: trigger notification to project.owner here (build notification module later)

    return res.status(200).json({
      success: true,
      message: `Project ${status} successfully`,
      data: {
        projectId: project._id,
        status: project.status,
        feedback: project.feedback,
        reviewedAt: project.reviewedAt,
      },
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to review project",
    });
  }
};

export const editProject = async (req, res, next) => {
  const files = req.files;

  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project || project.isDeleted) throw new NotFoundError("Project not found");

    if (project.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError("Only the project owner can edit this project");
    }
    const allowedFields = [
      "title", "shortDescription", "fullDescription",
      "category", "academicYear", "semester",
      "techStack", "githubUrl", "liveUrl",
      "members", "presentedAt",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    const replaceSingleMedia = async (fieldName, file, folder) => {
      if (!file) return;
      if (project[fieldName]?.publicId) {
        await deleteFromCloudinary(
          project[fieldName].publicId,
          fieldName === "video" ? "video" : "image"
        );
      }
      project[fieldName] = await uploadToCloudinary(file.path, folder);
    };

    await replaceSingleMedia("cover",     files?.cover?.[0],     "projects/covers");
    await replaceSingleMedia("ppt",       files?.ppt?.[0],       "projects/ppts");
    await replaceSingleMedia("pdf",       files?.pdf?.[0],       "projects/pdfs");
    await replaceSingleMedia("video",     files?.video?.[0],     "projects/videos");
    await replaceSingleMedia("teamPhoto", files?.teamPhoto?.[0], "projects/team");

    if (files?.screenshots?.length) {
      const existing = project.screenshots?.length ?? 0;
      const incoming = files.screenshots.length;

      if (existing + incoming > SCREENSHOTS_LIMIT) {
        throw new BadRequestError(
          `Screenshots limit is ${SCREENSHOTS_LIMIT}. You have ${existing} existing and are adding ${incoming}. Remove some first.`
        );
      }

      const uploaded = await Promise.all(
        files.screenshots.map((f) => uploadToCloudinary(f.path, "projects/screenshots"))
      );

      project.screenshots = [...(project.screenshots ?? []), ...uploaded];
    }

    // ── Reset status to pending if was approved or rejected ──
    if (project.status !== "pending") {
      project.status = "pending";
      project.feedback = "";
      project.reviewedBy = undefined;
      project.reviewedAt = undefined;
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });

  } catch (error) {
    cleanupTmpFiles(files);
    next(error);
  }
};