import express from "express";
import {addProject } from "../controllers/project.controller.js";
import { uploadToCloudinary } from "../utils/cloudinary.utils.js";
import { projectUpload } from "../middleware/projectUpload.middleware.js";

const projectRouter = express.Router();

projectRouter.post("/addProject",projectUpload, addProject);

export default projectRouter;