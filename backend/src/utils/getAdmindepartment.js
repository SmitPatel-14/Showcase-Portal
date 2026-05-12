import { NotFoundError, ForbiddenError } from "../utils/Apierrors.utils.js";
import User from "../models/user.model.js";

export const getAdminDepartment = async (adminId) => {
  const admin = await User.findById(adminId).select("department");
  if (!admin?.department) throw new ForbiddenError("Admin department not assigned");
  return admin.department;
};