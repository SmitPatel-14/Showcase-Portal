import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  DEPARTMENT_CODES,
  CLG_CODE,
  ROLE_ENUM,
} from "../constant/enums.contant.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    enrollmentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLE_ENUM),
      default: ROLE_ENUM.STUDENT,
    },

    department: {
      type: String,
      enum: Object.values(DEPARTMENT_CODES),
    },

    bio: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    refreshTokenExpiry: {
      type: Date,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
