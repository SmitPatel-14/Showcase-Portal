import express from "express";
import {addProject } from "../controllers/project.controller.js";
import { uploadToCloudinary } from "../utils/cloudinary.utils.js";
import { projectUpload } from "../middleware/projectUpload.middleware.js";
import authenticate from "../middleware/auth.middleware.js";
import { ROLE_ENUM } from "../constant/enums.contant.js";
import authorize from "../middleware/rbac.middleware.js";

const projectRouter = express.Router();

projectRouter.post("/addProject", authenticate, authorize(ROLE_ENUM.STUDENT), projectUpload, addProject);


export default projectRouter;