import Achievement from "../models/achivement.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.utils.js";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
} from "../utils/Apierrors.utils.js";
import { PROJECT_STATUS } from "../constant/enums.contant.js";
import { getAdminDepartment } from "../utils/getAdminDepartment.js";
import User from "../models/user.model.js";

export const addAchievement = async (req, res, next) => {
  try {
    // trim all body fields (handles Postman leading space issue)
    const title = req.body.title?.trim();
    const description = req.body.description?.trim();
    const type = req.body.type?.trim();
    const issuingOrganization = req.body.issuingOrganization?.trim();
    const achievedDate = req.body.achievedDate?.trim();

    if (
      !title ||
      !description ||
      !type ||
      !issuingOrganization ||
      !achievedDate
    ) {
      throw new BadRequestError("All fields are required");
    }

    if (!req.file) {
      throw new BadRequestError("Proof file is required");
    }

    if (!req.user?.id) {
      throw new UnauthorizedError("User not authenticated");
    }

    console.log("Uploading to cloudinary, path →", req.file.path);
    const uploaded = await uploadToCloudinary(
      req.file.path,
      "achievements/proofs",
    );
    console.log("Cloudinary result →", uploaded);

    if (!uploaded?.url || !uploaded?.publicId) {
      throw new InternalServerError("Failed to upload proof to cloudinary");
    }

    const achievement = await Achievement.create({
      title,
      description,
      type,
      issuingOrganization,
      achievedDate,
      proof: {
        url: uploaded.url, // ← not secure_url
        publicId: uploaded.publicId, // ← not public_id
      },
      owner: req.user.id,
    });

    return ApiResponse.success(
      res,
      201,
      "Achievement submitted for review",
      achievement,
    );
  } catch (err) {
    next(err);
  }
};

export const getMyAchievements = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    const filter = { owner: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Achievement.countDocuments(filter),
    ]);

    return ApiResponse.success(res, 200, "Achievements fetched", {
      achievements,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllAchievements = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    const department = await getAdminDepartment(req.user.id);

    const departmentUsers = await User.find(
      { department, isDeleted: false },
      "_id",
    );
    const userIds = departmentUsers.map((u) => u._id);

    const filter = { owner: { $in: userIds } };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("owner", "name enrollmentNumber department")
        .select("-__v"),
      Achievement.countDocuments(filter),
    ]);

    return ApiResponse.success(res, 200, "All achievements fetched", {
      achievements,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};
//for admin review (approve/reject with feedback)
export const reviewAchievement = async (req, res, next) => {
  try {
    const { status, feedback } = req.body;

    const validStatuses = [PROJECT_STATUS.APPROVED, PROJECT_STATUS.REJECTED];
    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError(
        `Status must be one of: ${validStatuses.join(", ")}`,
      );
    }

    if (status === PROJECT_STATUS.REJECTED && !feedback?.trim()) {
      throw new BadRequestError(
        "Feedback is required when rejecting an achievement",
      );
    }

    const achievement = await Achievement.findById(req.params.id).populate(
      "owner",
      "department",
    );
    if (!achievement) throw new NotFoundError("Achievement not found");

    const department = await getAdminDepartment(req.user.id);

    if (achievement.owner.department !== department) {
      throw new ForbiddenError(
        "You can only review achievements from your department",
      );
    }

    if (achievement.status !== PROJECT_STATUS.PENDING) {
      throw new BadRequestError("Only pending achievements can be reviewed");
    }

    achievement.status = status;
    achievement.reviewedBy = req.user._id;
    achievement.reviewedAt = new Date();
    achievement.feedback =
      status === PROJECT_STATUS.REJECTED ? feedback.trim() : undefined;

    await achievement.save();

    return ApiResponse.success(
      res,
      200,
      `Achievement ${status.toLowerCase()} successfully`,
      achievement,
    );
  } catch (err) {
    next(err);
  }
};

export const getAchievementById = async (req, res, next) => {
  try {
    const achievement = await Achievement.findById(req.params.id)
      .populate("owner", "name enrollmentNumber department")
      .populate("reviewedBy", "name email")
      .select("-__v");

    if (!achievement) throw new NotFoundError("Achievement not found");

    // Non-admin students can only see approved or their own
    const isAdmin = req.user?.role === "admin";
    const isOwner =
      achievement.owner.id.toString() === req.user?.id?.toString();

    if (
      !isAdmin &&
      !isOwner &&
      achievement.status !== PROJECT_STATUS.APPROVED
    ) {
      throw new ForbiddenError("Access forbidden");
    }

    return ApiResponse.success(res, 200, "Achievement fetched", achievement);
  } catch (err) {
    next(err);
  }
};

export const editAchievement = async (req, res, next) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) throw new NotFoundError("Achievement not found");

    if (achievement.owner.toString() !== req.user.id.toString()) {
      throw new ForbiddenError("You are not the owner of this achievement");
    }

    if (achievement.status === PROJECT_STATUS.APPROVED) {
      throw new ForbiddenError("Approved achievements cannot be edited");
    }

    const { title, description, type, issuingOrganization, achievedDate } =
      req.body;

    if (title) achievement.title = title;
    if (description) achievement.description = description;
    if (type) achievement.type = type;
    if (issuingOrganization)
      achievement.issuingOrganization = issuingOrganization;
    if (achievedDate) achievement.achievedDate = achievedDate;

    // Replace proof if new file uploaded
    if (req.file) {
      await deleteFromCloudinary(achievement.proof.publicId);
      const uploaded = await uploadToCloudinary(
        req.file.path,
        "achievements/proofs",
      );
      if (!uploaded)
        throw new InternalServerError("Failed to upload new proof");
      achievement.proof = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      };
    }

    // Reset to pending on edit so admin re-reviews
    achievement.status = PROJECT_STATUS.PENDING;
    achievement.feedback = undefined;
    achievement.reviewedBy = undefined;
    achievement.reviewedAt = undefined;

    await achievement.save();

    return ApiResponse.success(
      res,
      200,
      "Achievement updated and resubmitted for review",
      achievement,
    );
  } catch (err) {
    next(err);
  }
};
