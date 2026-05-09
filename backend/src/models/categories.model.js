import mongoose from "mongoose";
import { DEPARTMENT_CODES } from "../constant/enums.contant.js";

const categorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: {
        values: Object.values(DEPARTMENT_CODES), 
        message: "Invalid department",
      },
    },
  },
  { timestamps: true },
);

categorySchema.index({ category: 1, departmentCode: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

export default Category;
