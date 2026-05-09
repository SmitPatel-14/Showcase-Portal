import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import { NotFoundError, ForbiddenError } from "../utils/Apierrors.utils.js";

//for faculty/admin
export const getProfileById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ _id: userId, isActive: true })
      .select("-password -refreshToken -otp -otpExpiry")
      .lean();

    if (!user) throw new NotFoundError("User not found");

    // Fetch approved projects owned by or member of
    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .select("likeCount viewCount ")
      .sort({ createdAt: -1 })
      .lean();

    const totalLikes = projects.reduce((sum, p) => sum + (p.likeCount || 0), 0);
    const totalViews = projects.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    return ApiResponse.success(res, 200, "Profile fetched successfully", {
      user,
      stats: {
        totalProjects: projects.length,
        totalLikes,
        totalViews,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({ _id: userId,isActive: true })
      .select("-password -refreshToken -otp -otpExpiry")
      .lean();

    if (!user) throw new NotFoundError("User not found");

    // Include ALL statuses for own profile (student sees pending/rejected too)
    const projects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .select("likeCount viewCount")
      .sort({ createdAt: -1 })
      .lean();

    const approvedProjects = projects.filter(p => p.status === "approved");
    const totalLikes = approvedProjects.reduce((sum, p) => sum + (p.likeCount || 0), 0);
    const totalViews = approvedProjects.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    return ApiResponse.success(res, 200, "Profile fetched successfully", {
      user,
      stats: {
        totalProjects: projects.length,
        approvedProjects: approvedProjects.length,
        totalLikes,
        totalViews,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const editMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, bio } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    if (Object.keys(updates).length === 0) {
      throw new BadRequestError("No valid fields provided to update");
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, isDeleted: false, isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -refreshToken -otp -otpExpiry");

    if (!user) throw new NotFoundError("User not found");

    return ApiResponse.success(res, 200, "Profile updated successfully", { user });
  } catch (err) {
    next(err);
  }
};