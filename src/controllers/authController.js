import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import AppError from "../utils/appError.js";

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.ACCESS_SECRET,
    { expiresIn: "30d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
    },
    process.env.REFRESH_SECRET,
    { expiresIn: "60d" }
  );
};

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("No user found with this email", 400));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError("Incorrect password", 400));
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshToken = refreshToken;
  await user.save();

  user.password = undefined;

  res.status(200).json({
    status: "success",
    accessToken,
    refreshToken,
    user,
  });
});

export const refreshAccessToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError("Refresh token not provided", 400));
  }

  const user = await User.findOne({ refreshToken });

  if (!user) {
    return next(new AppError("Invalid refresh token", 403));
  }

  jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return next(new AppError("Invalid refresh token", 403));
    }
    const newAccessToken = generateAccessToken(user);
    res.status(200).json({
      status: "success",
      accessToken: newAccessToken,
    });
  });
});

export const logOut = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError("Please provide refresh token", 400));
  }

  const user = await User.findOne({ refreshToken });

  if (!user) {
    return next(new AppError("Invalid refresh token", 400));
  }

  user.refreshToken = null;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Successfully logged out",
  });
});
