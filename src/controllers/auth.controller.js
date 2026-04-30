import { BadRequestError } from "../utils/Apierrors.utils.js";
import { CLG_CODE } from "../constant/clgportal.constant.js";
import User from "../models/User.model.js";
import { DEPARTMENT_CODES } from "../models/User.model.js";
import nodemailer from "nodemailer";
import { ApiResponse } from "../utils/Apiresponse.utils.js";
import transporter from "../config/mailer.config.js";
import next from "next";
import dotenv from "dotenv";

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

    let emailStatus = "User registered successfully,check email for credentials.";
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

export { signUp };
