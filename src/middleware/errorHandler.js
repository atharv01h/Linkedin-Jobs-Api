export function errorHandler(err, req, res, next) {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
}