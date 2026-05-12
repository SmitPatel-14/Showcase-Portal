import express from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/rbac.middleware.js';
import { ROLE_ENUM } from '../constant/enums.contant.js';
import { createAchievement, getAchievementsByUserId } from '../controllers/achievement.controller.js';

const router = express.Router();

router.post('/addAchievement', authenticate, authorize(ROLE_ENUM.STUDENT), createAchievement);

export default router;