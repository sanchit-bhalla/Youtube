class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    (this.statusCode = statusCode), (this.data = data);
    this.message = message;
    this.success = statusCode < 400; // bcz it is ApiResponse, for statusCode > 400 we send ApiError
  }
}
