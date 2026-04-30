import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const DEPARTMENT_CODES = {
  "05": "Chemical Engineering",
  "06": "Civil Engineering",
  "07": "Computer Engineering",
  "09": "Electrical Engineering",
  "19": "Mechanical Engineering",
};

const ROLE_ENUM = ["student", "admin"];

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
      enum: ROLE_ENUM,
      default: ROLE_ENUM[0],
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
    isDeleted: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model("User", userSchema);
export default User;