import User from "../models/userModel.js";
import catchAsync from "../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import AppError from "../utils/appError.js";
import sendMail from "../utils/mailHelper.js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

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

  if (user.status === "I" || user.status === "S") {
    return next(new AppError("Your account is inactive or suspended", 403));
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

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("No user found with this email", 404));
  }

  const resetCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  user.resetCode = resetCode;
  user.resetCodeExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendMail({
    to: email,
    subject: "Your Password Reset Code",
    template: "forgotPassword",
    templateData: { otp: resetCode },
  });

  res.status(200).json({
    status: "success",
    message: "Password reset code sent to your email.",
  });
});

export const verifyResetCode = catchAsync(async (req, res, next) => {
  const { email, resetCode } = req.body;

  if (!email || !resetCode) {
    return next(new AppError("Please provide email and reset code", 400));
  }

  const user = await User.findOne({ email, resetCode });
  if (!user) {
    return next(new AppError("Invalid reset code or email", 400));
  }
  if (user.resetCodeExpiry < Date.now()) {
    return next(new AppError("Reset code has expired", 400));
  }
  res.status(200).json({
    status: "success",
    message: "Reset code verified successfully",
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, resetCode, newPassword } = req.body;

  if (!email || !resetCode || !newPassword) {
    return next(
      new AppError("Please provide email, reset code and new password", 400)
    );
  }

  const user = await User.findOne({ email, resetCode });

  if (!user) {
    return next(new AppError("Invalid reset code or email", 400));
  }

  if (user.resetCodeExpiry < Date.now()) {
    return next(new AppError("Reset code has expired", 400));
  }

  user.password = newPassword;
  user.resetCode = undefined;
  user.resetCodeExpiry = undefined;
  await user.save();

  await sendMail({
    to: user.email,
    subject: "Your Password Has Been Reset",
    template: "resetPassword",
    templateData: {
      name: user.name,
      password: newPassword,
      loginUrl: `${process.env.FRONTEND_URL}/auth/login`,
    },
  });

  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
  });
});

export const adminResetPassword = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.password = "12345678";
  await user.save();
  await sendMail({
    to: user.email,
    subject: "Your Password Has Been Reset",
    template: "resetPassword",
    templateData: {
      name: user.name,
      password: "12345678",
      loginUrl: `${process.env.FRONTEND_URL}/auth/login`,
    },
  });
  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
  });
});
