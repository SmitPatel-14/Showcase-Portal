// middleware/authenticate.js
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/Apierrors.utils.js";


const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError("Access denied. Please login.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;
    next();
    
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Session expired. Please login again.");
    }
    if (error.name === "JsonWebTokenError") {
      throw new UnauthorizedError("Invalid token.");
    }
    next(error);
  }
};

export default authenticate;
