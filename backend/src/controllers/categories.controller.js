import { BadRequestError, ConflictError, InternalServerError } from "../utils/Apierrors.utils.js";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import { DEPARTMENT_CODES } from "../constant/enums.contant.js";
import  Category from "../models/categories.model.js";

export const createCategory = async (req, res, next) => {
  try {
    const { category, departmentCode } = req.body;

    if (!category || !departmentCode) {
      throw new BadRequestError("Category and department code are required");
    }

    if (!Object.keys(DEPARTMENT_CODES).includes(departmentCode)) {
      throw new BadRequestError("Invalid department code");
    }

    const existing = await Category.findOne({ category: category.trim(), departmentCode });
    if (existing) {
      throw new ConflictError(`Category "${category}" already exists in this department`);
    }

    const newCategory = await Category.create({ category: category.trim(), departmentCode });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    next(error);
  }
};