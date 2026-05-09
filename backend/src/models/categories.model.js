import mongoose from "mongoose";
import { DEPARTMENT_CODES } from "../constant/enums.contant.js";

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    departmentCode: {
      type: String,
      required: [true, "Department code is required"],
      enum: {
        values: Object.keys(DEPARTMENT_CODES),
        message: "Invalid department code",
      },
    },
  },
  { timestamps: true }
);

categorySchema.index({ category: 1, departmentCode: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;