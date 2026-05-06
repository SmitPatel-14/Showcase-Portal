import express from "express";
import { signUp,logIn,forgotPassword,resetPassword,logOut,adminSignUp} from "../controllers/auth.controller.js";
import authenticate from "../middleware/auth.middleware.js";


const router = express.Router();

router.post("/register", signUp);

router.post("/login", logIn);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/logout",authenticate, logOut);

router.post("/register-admin",adminSignUp);

export default router;
