
import { ForbiddenError } from "../utils/Apierrors.utils.js";

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("You don't have permission to access this.");
    }
    next();
  };
};


export default authorize;