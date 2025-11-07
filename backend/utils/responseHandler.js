// Success response helper
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

// Error response helper
const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors })
  });
};

// Validation error response
const validationError = (res, errors) => {
  return errorResponse(res, 'Validation failed', 400, errors);
};

// Not found error response
const notFoundError = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

// Unauthorized error response
const unauthorizedError = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

module.exports = {
  successResponse,
  errorResponse,
  validationError,
  notFoundError,
  unauthorizedError
};
