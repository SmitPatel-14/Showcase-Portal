import express from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/rbac.middleware.js';
import { ROLE_ENUM } from '../constant/enums.contant.js';
import {
  addAchievement,
  getMyAchievements,
  getAllAchievements,
  getAchievementById,
  reviewAchievement,
  editAchievement,
} from "../controllers/achivement.controller.js";
import { achievementUpload } from '../middleware/projectUpload.middleware.js';

const router = express.Router();

router.post('/addAchievement', authenticate, authorize(ROLE_ENUM.STUDENT),achievementUpload, addAchievement);
router.get('/my-achievements', authenticate, getMyAchievements);//for students to view their own achievements with filters
router.get('/all-achievements', authenticate,authorize(ROLE_ENUM.ADMIN), getAllAchievements);//for admin with filters
router.get('/achievementFullDetails/:id', authenticate, getAchievementById);//for both students and admin, but students can only access their own achievements while admin can access all
router.put('/editAchievement/:id', authenticate, authorize(ROLE_ENUM.STUDENT), achievementUpload, editAchievement);//
router.post('/reviewAchievement/:id', authenticate, authorize(ROLE_ENUM.ADMIN), reviewAchievement);

export default router;