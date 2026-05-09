import express from "express";
import { uploadToCloudinary } from "../utils/cloudinary.utils.js";
import { projectUpload } from "../middleware/projectUpload.middleware.js";
import authenticate from "../middleware/auth.middleware.js";
import { ROLE_ENUM } from "../constant/enums.contant.js";
import authorize from "../middleware/rbac.middleware.js";
import {addProject,reviewProject,editProject,getProjects,getProjectById} from "../controllers/project.controller.js";


const router = express.Router();

router.post("/addProject", authenticate, authorize(ROLE_ENUM.STUDENT), projectUpload, addProject);
router.post("/reviewProject/:projectId", authenticate, authorize(ROLE_ENUM.ADMIN), reviewProject);
router.patch("/editProject/:projectId", authenticate, authorize(ROLE_ENUM.STUDENT), projectUpload, editProject); 
router.get("/getProjects", authenticate, getProjects);
router.get("/getProjects/:projectId", authenticate, getProjectById); 

export default router;