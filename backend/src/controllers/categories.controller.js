import { BadRequestError, ConflictError, InternalServerError } from "../utils/Apierrors.utils.js";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import { DEPARTMENT_CODES } from "../constant/enums.contant.js";
import  Category from "../models/categories.model.js";

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

