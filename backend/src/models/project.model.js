import mongoose from "mongoose";
import { PROJECT_STATUS } from "../constant/enums.contant.js";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    fullDescription: { type: String, required: true, trim: true },

    category: { type: String, trim: true },

    //Academic
    academicYear: { type: String, required: true, trim: true }, // e.g. "2023-24"
    semester: { type: Number, min: 1, max: 8, required: true },

    //Tech Stack
    techStack: { type: [String], default: [], required: true },

    //External Links
    githubUrl: { type: String, trim: true, required: true },
    liveUrl: { type: String, trim: true },

    // Media (stored as Cloudinary URLs + public IDs)
    cover: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    }, // thumbnail/cover image
    screenshots: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      required: true,
      default: [],
    },
    ppt: { url: String, publicId: String }, // presentation file
    pdf: { url: String, publicId: String }, // report/documentation
    video: { url: String, publicId: String }, // demo video
    teamPhoto: { url: String, publicId: String },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // project lead/creator
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // teammates, can be empty

    presentedAt: [
      {
        eventName: { type: String, trim: true, required: true },
        eventDate: { type: Date },
        location: { type: String, trim: true },
        award: { type: String, trim: true },
      },
    ],

    
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PENDING,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    feedback: { type: String, trim: true }, // shown to student on rejection

    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },

  },
  { timestamps: true },
);

projectSchema.index({ status: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ isFeatured: 1, status: 1 });
projectSchema.index({ createdAt: -1 });

const Project = mongoose.model("Project", projectSchema);
export default Project;
