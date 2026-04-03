function errorHandler(err, req, res, next) {
  // Handle payload too large error from express.json limit
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Payload too large. Maximum request size is 10kb.'
    });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors)
        .map((error) => error.message)
        .join(", ")
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "A record with that value already exists"
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Server error"
  });
}

module.exports = errorHandler;
