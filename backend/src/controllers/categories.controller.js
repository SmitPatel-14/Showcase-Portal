import { BadRequestError, ConflictError, InternalServerError ,NotFoundError} from "../utils/Apierrors.utils.js";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import { DEPARTMENT_CODES } from "../constant/enums.contant.js";
import  Category from "../models/categories.model.js";
import User from "../models/User.model.js";

export const createCategory = async (req, res, next) => {
  try {
    const { category, department } = req.body;

    if (!category || !department) {
      throw new BadRequestError("Category and department are required");
    }

    if (!Object.values(DEPARTMENT_CODES).includes(department)) {
      throw new BadRequestError("Invalid department");
    }

    const existing = await Category.findOne({ category: category.trim(), department });
    if (existing) {
      throw new ConflictError(`Category "${category}" already exists in this department`);
    }

    const newCategory = await Category.create({ category: category.trim(), department });

    ApiResponse.success(res,200, "Category created successfully",{
      category
    }); 
   } catch (error) {
    next(error);
  }
};

export const getCategoriesByDepartment = async (req, res, next) => {
  try {
   const userId = req.user.id;
    const user = await User.findById(userId, "department").lean();
    if (!user) throw new NotFoundError("User not found");

    const categories = await Category.find(
      { department: user.department },
      "_id category"
    ).lean();

    return ApiResponse.success(res, 200, "Categories fetched successfully", categories);
  } catch (error) {
    next(error);
  }
};