const HttpStatus = require('../constants/httpStatus');

class AppError extends Error {
  constructor(
    message,
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    details = null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, HttpStatus.NOT_FOUND, code);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_ERROR') {
    super(message, HttpStatus.BAD_REQUEST, code, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    super(message, HttpStatus.UNAUTHORIZED, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message, HttpStatus.FORBIDDEN, code);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(message, HttpStatus.CONFLICT, code);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
