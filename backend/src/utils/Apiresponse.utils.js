export class ApiResponse {
  constructor(
    statusCode,
    message = "Success",
    data = null
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
  

  static success(
    res,
    statusCode = 200,
    message = "Success",
    data = null
  ) {
    return res.status(statusCode).json(
      new ApiResponse(statusCode, message, data)
    );
  }
}