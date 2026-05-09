import { ROLE_ENUM } from "../constant/enums.contant.js";
import { createCategory } from "../controllers/categories.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import authorize from "../middleware/rbac.middleware.js";
import express from "express";

const router = express.Router();

router.post("/createcategory",authMiddleware, authorize(ROLE_ENUM.ADMIN), createCategory);

export default router;