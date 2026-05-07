import Project from "../models/project.model.js";
import { BadRequestError } from "../utils/Apierrors.utils.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  getResourceType,
} from "../utils/cloudinary.utils.js";
import { cleanupTmpFiles } from "../utils/cleanup.helpers.js";
import {
  PROJECT_STATUS,
  SCREENSHOTS_LIMIT,
} from "../constant/enums.contant.js";
import next from "next";
import { DEPARTMENT_CODES,ROLE_ENUM } from "../constant/enums.contant.js";


export const addProject = async (req, res, next) => {
  const files = req.files;
  const newlyUploaded = [];

  try {
    const {
      title, shortDescription, fullDescription,
      category, academicYear, semester,
      techStack, githubUrl, liveUrl, members, presentedAt,
    } = req.body;

    if (!title || !shortDescription || !fullDescription || !academicYear || !semester || !githubUrl) {
      throw new BadRequestError("Missing required fields: title, shortDescription, fullDescription, academicYear, semester, githubUrl");
    }

    if (!files?.cover?.[0]) throw new BadRequestError("Cover image is required");

    const existingProject = await Project.findOne({ title: title.trim() });
    if (existingProject) throw new ConflictError("Project with this title already exists");

    const parsedTechStack   = typeof techStack   === "string" ? JSON.parse(techStack)   : (techStack   ?? []);
    const parsedMembers     = typeof members      === "string" ? JSON.parse(members)     : (members     ?? []);
    const parsedPresentedAt = typeof presentedAt  === "string" ? JSON.parse(presentedAt) : (presentedAt ?? []);

    const upload = async (file, folder, resourceType = "image") => {
      const uploaded = await uploadToCloudinary(file.path, folder, resourceType);
      newlyUploaded.push({ publicId: uploaded.publicId, resourceType });
      return uploaded;
    };

    const [cover, ...rest] = await Promise.all([
      upload(files.cover[0], "projects/covers", "image"),
      files?.screenshots?.length
        ? Promise.all(files.screenshots.map((f) => upload(f, "projects/screenshots", "image")))
        : Promise.resolve([]),
      files?.ppt?.[0]       ? upload(files.ppt[0],       "projects/ppts",   "raw")   : Promise.resolve(null),
      files?.pdf?.[0]       ? upload(files.pdf[0],       "projects/pdfs",   "raw")   : Promise.resolve(null),
      files?.video?.[0]     ? upload(files.video[0],     "projects/videos", "video") : Promise.resolve(null),
      files?.teamPhoto?.[0] ? upload(files.teamPhoto[0], "projects/team",   "image") : Promise.resolve(null),
    ]);

    const [screenshots, ppt, pdf, video, teamPhoto] = rest;

    let project;
    try {
      project = await Project.create({
        title: title.trim(),
        shortDescription,
        fullDescription,
        category,
        academicYear,
        semester: Number(semester),
        techStack: parsedTechStack,
        githubUrl,
        liveUrl,
        cover,
        screenshots: screenshots ?? [],
        ...(ppt       && { ppt }),
        ...(pdf       && { pdf }),
        ...(video     && { video }),
        ...(teamPhoto && { teamPhoto }),
        owner: req.user.id,
        members: parsedMembers,
        presentedAt: parsedPresentedAt,
      });
    } catch (saveError) {
      await Promise.allSettled(
        newlyUploaded.map(({ publicId, resourceType }) =>
          deleteFromCloudinary(publicId, resourceType)
        )
      );
      throw saveError;
    }

    // TODO: notify admins for review

    return res.status(201).json({
      success: true,
      message: "Project submitted successfully",
      data: project,
    });

  } catch (error) {
    cleanupTmpFiles(files);
    next(error);
  }
};

export const editProject = async (req, res, next) => {
  const files = req.files;
  const userId = req.user.id;
  const newlyUploaded = [];

  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project || project.isDeleted) throw new NotFoundError("Project not found");

    if (project.owner.toString() !== userId.toString()) {
      throw new ForbiddenError("Only the Team Lead can edit this project");
    }

    const allowedFields = [
      "title", "shortDescription", "fullDescription",
      "category", "academicYear", "semester",
      "techStack", "githubUrl", "liveUrl", "members", "presentedAt",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] === undefined) return;
      if (field === "techStack" || field === "members") {
        project[field] = JSON.parse(req.body[field]);
      } else if (field === "presentedAt") {
        const val = req.body[field];
        project[field] = typeof val === "string" ? JSON.parse(val) : val;
      } else {
        project[field] = req.body[field];
      }
    });

    const removableFields = ["cover", "ppt", "pdf", "video", "teamPhoto"];
    await Promise.all(
      removableFields.map(async (field) => {
        if (
          req.body[`remove_${field}`] === "true" &&
          project[field]?.publicId &&
          !files?.[field]?.[0]
        ) {
          await deleteFromCloudinary(project[field].publicId, getResourceType(field));
          project[field] = undefined;
        }
      })
    );

    const replaceSingleMedia = async (fieldName, file, folder) => {
      if (!file) return;
      const resourceType = getResourceType(fieldName);
      if (project[fieldName]?.publicId) {
        await deleteFromCloudinary(project[fieldName].publicId, resourceType);
      }
      const uploaded = await uploadToCloudinary(file.path, folder, resourceType);
      project[fieldName] = uploaded;
      newlyUploaded.push({ publicId: uploaded.publicId, resourceType });
    };

    await Promise.all([
      replaceSingleMedia("cover",     files?.cover?.[0],     "projects/covers"),
      replaceSingleMedia("ppt",       files?.ppt?.[0],       "projects/ppts"),
      replaceSingleMedia("pdf",       files?.pdf?.[0],       "projects/pdfs"),
      replaceSingleMedia("video",     files?.video?.[0],     "projects/videos"),
      replaceSingleMedia("teamPhoto", files?.teamPhoto?.[0], "projects/team"),
    ]);

    if (req.body.removeScreenshots?.length) {
      const toRemove = JSON.parse(req.body.removeScreenshots);
      await Promise.allSettled(
        toRemove.map((publicId) => deleteFromCloudinary(publicId, "image"))
      );
      project.screenshots = project.screenshots.filter(
        (s) => !toRemove.includes(s.publicId)
      );
    }

    if (files?.screenshots?.length) {
      const existing = project.screenshots?.length ?? 0;
      const incoming = files.screenshots.length;

      if (existing + incoming > SCREENSHOTS_LIMIT) {
        throw new BadRequestError(
          `Screenshots limit is ${SCREENSHOTS_LIMIT}. You have ${existing} existing and are adding ${incoming}. Remove some first.`
        );
      }

      const uploaded = await Promise.all(
        files.screenshots.map((f) =>
          uploadToCloudinary(f.path, "projects/screenshots", "image")
        )
      );

      uploaded.forEach((u) =>
        newlyUploaded.push({ publicId: u.publicId, resourceType: "image" })
      );
      project.screenshots = [...(project.screenshots ?? []), ...uploaded];
    }

    if (project.status !== PROJECT_STATUS.PENDING) {
      project.status   = PROJECT_STATUS.PENDING;
      project.feedback = "";
      project.reviewedBy  = undefined;
      project.reviewedAt  = undefined;
    }

    try {
      await project.save();
    } catch (saveError) {
      await Promise.allSettled(
        newlyUploaded.map(({ publicId, resourceType }) =>
          deleteFromCloudinary(publicId, resourceType)
        )
      );
      throw saveError;
    }

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
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
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
    project.feedback =
      status === PROJECT_STATUS.REJECTED ? feedback.trim() : "";

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



export const getProjects = async (req, res, next) => {
  try {
    console.log(req.user);
    const { role, id: userId} = req.user;

    // ── Pagination ───────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;

    // ── Query params ─────────────────────────────────────────
    const { search, department } = req.query;

    const filter = { isDeleted: false };

    // ── Role-based base filter ───────────────────────────────
    if (role === ROLE_ENUM.ADMIN) {
      // admin sees only their department's pending + rejected
      filter.status = { $in: ["pending", "rejected"] };

      // match department name to owner's department
      // find all users in admin's department
      const deptUsers = await User.find(
        { department: userDepartment, isDeleted: false },
        "_id"
      ).lean();
      filter.owner = { $in: deptUsers.map((u) => u._id) };

    } else if (role === ROLE_ENUM.STUDENT) {
      // student sees only their own projects — all statuses
      filter.$or = [{ owner: userId }, { members: userId }];

    } else {
      // public — approved only
      filter.status = "approved";
    }

    // ── Department filter (public/student can filter by dept) ─
    if (department && role !== ROLE_ENUM.ADMIN) {
      // department query param = full name e.g. "Computer Engineering"
      // find users in that department, filter projects by owner
      const deptUsers = await User.find(
        { department, isDeleted: false },
        "_id"
      ).lean();
      const deptUserIds = deptUsers.map((u) => u._id);

      // merge with existing owner filter if student
      if (filter.$or) {
        // student: their projects AND in that department
        filter.$and = [
          { $or: filter.$or },
          { owner: { $in: deptUserIds } },
        ];
        delete filter.$or;
      } else {
        filter.owner = { $in: deptUserIds };
      }
    }

    // ── Search (title only) ──────────────────────────────────
    if (search?.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    // ── Query ────────────────────────────────────────────────
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select("_id title category semester academicYear techStack status likeCount viewCount cover owner members createdAt")
        .populate("owner",   "name enrollmentNumber department")
        .populate("members", "name enrollmentNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    // ── Shape card response ──────────────────────────────────
    const cards = projects.map(({ cover, owner, ...rest }) => ({
      ...rest,
      cover: cover?.url ?? null,
      owner: owner
        ? {
            _id: owner._id,
            name: owner.name,
            enrollmentNumber: owner.enrollmentNumber,
            department: owner.department,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: cards,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });

  } catch (error) {
    next(error);
  }
};