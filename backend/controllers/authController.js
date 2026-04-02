const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const User = require("../models/User");

function sendUserResponse(res, statusCode, message, user) {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }

  const { name, email, password, role } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists"
    });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role === "organizer" || role === "admin" ? role : "user"
  });

  sendUserResponse(res, 201, "User registered successfully", user);
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  sendUserResponse(res, 200, "Login successful", user);
});

const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Current user fetched successfully",
    data: req.user
  });
});

const updateDetails = asyncHandler(async (req, res) => {
  const updates = {
    name: req.body.name || req.user.name,
    email: req.body.email || req.user.email
  };

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  });

  sendUserResponse(res, 200, "User details updated successfully", user);
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    return res.status(400).json({
      success: false,
      message: "Current password is incorrect"
    });
  }

  user.password = newPassword;
  await user.save();

  sendUserResponse(res, 200, "Password updated successfully", user);
});

module.exports = {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword
};
