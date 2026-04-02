function authorize(...roles) {
  return function authorizeRoles(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "User role is not authorized to access this route"
      });
    }

    next();
  };
}

module.exports = authorize;
