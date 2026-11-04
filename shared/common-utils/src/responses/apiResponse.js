const HttpStatus = require('../constants/httpStatus');

const sendSuccess = (res, message = 'Success', data = null, statusCode = HttpStatus.OK) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (
  res,
  message = 'An error occurred',
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  code = 'INTERNAL_ERROR',
  details = null
) => {
  const errorObj = { code };
  if (details) {
    errorObj.details = details;
  }

  const response = {
    success: false,
    message,
    error: errorObj,
  };

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError,
};
