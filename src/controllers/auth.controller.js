import { BadRequestError, NotFoundError } from "../utils/Apierrors.utils.js";
import { CLG_CODE } from "../constant/clgportal.constant.js";
import User from "../models/User.model.js";
import { DEPARTMENT_CODES } from "../models/User.model.js";
import nodemailer from "nodemailer";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import transporter from "../config/mailer.config.js";
import next from "next";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const signUp = async (req, res, next) => {
  try {
    //get enrollment,email,password from req.body
    //validate enrollment
    //validate email
    //check if user already exists
    //register user
    //send email with login credentials
    //return success response

    const { name, enrollment, email, password } = req.body;

    //validations
    if (!enrollment || !email || !password || !name) {
      throw new BadRequestError("All fields are required ");
    }
    if (!/^\d{12}$/.test(enrollment)) {
      throw new BadRequestError("Enrollment must be exactly 12 digits");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new BadRequestError("Invalid email format");
    }

    //admmission year check
    const yearPart = enrollment.substring(0, 2);
    const admissionYear = 2000 + parseInt(yearPart);
    const currentYear = new Date().getFullYear();
    if (admissionYear > currentYear) {
      throw new BadRequestError(
        "Invalid enrollment number: Admission year is out of range",
      );
    }
    if (currentYear - admissionYear > 6) {
      throw new BadRequestError("You are Passed out student");
    }

    //college code check
    const collegeCode = enrollment.substring(2, 5);
    if (collegeCode !== CLG_CODE) {
      throw new BadRequestError("Only GEC Bharuch students allowed");
    }

    //department code check
    const department = DEPARTMENT_CODES[enrollment.substring(7, 9)];
    if (!department) {
      throw new BadRequestError("Invalid department code in enrollment number");
    }

    //check if user already exists
    const existingUser = await User.findOne({
      $or: [{ enrollmentNumber: enrollment }, { email }],
    });
    if (existingUser) {
      throw new BadRequestError("User already exists");
    }

    //register user
    const newUser = new User({
      enrollmentNumber: enrollment,
      email,
      password,
      department,
      name,
    });
    await newUser.save();

    //send email with login credentials
    const mailOptins = {
      from: process.env.USER_MAIL,
      to: newUser.email,
      subject: "Registration Successful – GEC Bharuch Showcase",
      text: `Hi ${newUser.name},\n\nYou have been registered successfully.\nEnrollment: ${newUser.enrollmentNumber}\nPassword: ${password}\nEmail: ${newUser.email}\n\nPlease keep this information safe.\n\nBest regards,\nGEC Bharuch Team`,
    };
    await newUser.save();

    let emailStatus =
      "User registered successfully,check email for credentials.";
    try {
      await transporter.sendMail(mailOptins);
    } catch (err) {
      console.error("Email failed:", err.message);
      emailStatus =
        "User registered, but email not sent. Please remember your credentials.";
    }
    ApiResponse.success(res, 201, emailStatus);
  } catch (error) {
    next(error);
  }
};

const logIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError("Email and password are required");
    }

    const user = await User.findOne({ email }).select(
      "+password",
    );
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestError("Invalid Password");
    }

    const payload = {
      id: user._id,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    };

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN) * 60 * 1000, // 15 min
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000, // 7 days
    });
    user.refreshToken = refreshToken;
    await user.save();

    ApiResponse.success(res, 200, "Login successful", {
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body; 
    if (!email) {
      throw new BadRequestError("Email is required");
    }
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    const OTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = OTP;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();
    let emailStatus = "OTP sent to your email";
    try {
    const mailOptions = {
      from: process.env.USER_MAIL,
      to: user.email,
      subject: "Password Reset OTP – GEC Bharuch Showcase",
      text: `Hi ${user.name},\n\nYou requested a password reset. Use the OTP below to reset your password. This OTP is valid for 10 minutes.\n\nOTP: ${OTP}\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nGEC Bharuch Team`,
    };
    await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error("Email failed:", err.message);
      emailStatus = "please Retry for Forgot password, there was an issue sending the OTP email.";
    }
    ApiResponse.success(res, 200, emailStatus);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new BadRequestError("All fields are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (user.otp !== otp) {
      throw new BadRequestError("Invalid OTP");
    }

    if (Date.now() > user.otpExpiry) {
      throw new BadRequestError("OTP has expired");
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    ApiResponse.success(res, 200, "Password reset successfully");
  } catch (error) {
    next(error);
  }
};

const logOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    user.refreshToken = null;
    await user.save();
    ApiResponse.success(res, 200, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

export { signUp, logIn, forgotPassword, resetPassword, logOut };
