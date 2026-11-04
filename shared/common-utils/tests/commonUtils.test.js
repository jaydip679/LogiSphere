const {
  HttpStatus,
  AppError,
  NotFoundError,
  ValidationError,
  sendSuccess,
  sendError,
} = require('../src');

describe('Common Utils', () => {
  describe('HttpStatus Constants', () => {
    it('defines standard HTTP status codes', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('AppError Hierarchy', () => {
    it('creates a base AppError with correct defaults', () => {
      const err = new AppError('Something went wrong');
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.isOperational).toBe(true);
    });

    it('creates a NotFoundError with 404', () => {
      const err = new NotFoundError('Shipment not found');
      expect(err.message).toBe('Shipment not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
    });

    it('creates a ValidationError with details', () => {
      const details = [{ field: 'weight', message: 'Weight must be positive' }];
      const err = new ValidationError('Validation failed', details);
      expect(err.statusCode).toBe(400);
      expect(err.details).toEqual(details);
    });
  });

  describe('ApiResponse Formatter', () => {
    it('formats a success response envelope', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendSuccess(res, 'Created', { id: '123' }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created',
        data: { id: '123' },
      });
    });

    it('formats an error response envelope without internal leaks', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      sendError(res, 'Resource missing', 404, 'NOT_FOUND');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Resource missing',
        error: { code: 'NOT_FOUND' },
      });
    });
  });
});
