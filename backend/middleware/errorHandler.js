function errorHandler(err, req, res, next) {
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
