const { ValidationError } = require('../errors/AppError');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError('Invalid request payload', details));
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
};
