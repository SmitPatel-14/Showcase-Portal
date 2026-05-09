import express from "express";
import authenticate from "../middleware/auth.middleware.js";
import authorize from "../middleware/rbac.middleware.js";
import { getProfileById,getMyProfile ,editMyProfile} from "../controllers/profile.controller.js";
import { ROLE_ENUM } from "../constant/enums.contant.js";

const router = express.Router();

router.get("/getProfile/:userId", authenticate,authorize(ROLE_ENUM.ADMIN), getProfileById);
router.get("/getMyProfile", authenticate, getMyProfile); // For logged-in user to get their own profile
router.patch("/editMyProfile", authenticate, editMyProfile); // For logged-in user to edit their own profile


export default router;