export class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    data = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 400
export class BadRequestError extends ApiError {
  constructor(message = "Invalid request data", data = null) {
    super(400, message, data);
  }
}

// 401
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized access", data = null) {
    super(401, message, data);
  }
}

// 403
export class ForbiddenError extends ApiError {
  constructor(message = "Access forbidden", data = null) {
    super(403, message, data);
  }
}

// 404
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", data = null) {
    super(404, message, data);
  }
}

// 409
export class ConflictError extends ApiError {
  constructor(message = "Resource already exists", data = null) {
    super(409, message, data);
  }
}

// 500
export class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error", data = null) {
    super(500, message, data);
  }
}