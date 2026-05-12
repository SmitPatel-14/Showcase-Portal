import mongoose from "mongoose";
import { PROJECT_STATUS, ACHIEVEMENT_TYPE } from "../constant/enums.contant.js";

const achievementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },

    type: {
      type: String,
      enum: Object.values(ACHIEVEMENT_TYPE), // Certificate | Hackathon | Competition
      required: true,
      trim: true,
    },

    issuingOrganization: { type: String, required: true, trim: true },
    achievedDate: { type: Date, required: true },

    // Proof media
    proof: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    }, // image or document

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Moderation
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS), // reuse PENDING | APPROVED | REJECTED
      default: PROJECT_STATUS.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    feedback: { type: String, trim: true },
  },
  { timestamps: true },
);

achievementSchema.index({ owner: 1 });
achievementSchema.index({ status: 1 });
achievementSchema.index({ type: 1, status: 1 });
achievementSchema.index({ createdAt: -1 });

const Achievement = mongoose.model("Achievement", achievementSchema);
export default Achievement;
