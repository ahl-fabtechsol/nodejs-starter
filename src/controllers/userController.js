import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/userModel.js";
import ApiFeaturesAggregate from "../utils/ApiFeaturesAggregate.js";

export const createUser = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Please provide email", 400));
  }

  const checkUser = await User.find({ email });
  if (checkUser.length > 0) {
    return next(new AppError("This email already exists", 400));
  }
  const user = await User.create(req.body);
  if (!user) {
    return next(new AppError("User not created", 400));
  }
  res.status(201).json({
    status: "success",
    user,
  });
});

export const getAllUsers = catchAsync(async (req, res, next) => {
  const pipeline = [];
  const apiFeatures = new ApiFeaturesAggregate(pipeline, req.query, User);
  apiFeatures.filter().sort().limitFields().paginate();
  const totalCountPipeline = [...pipeline].filter(
    (stage) => !stage.$skip && !stage.$limit
  );
  totalCountPipeline.push({ $count: "total" });
  const totalCountResult = await User.aggregate(totalCountPipeline);
  const count = totalCountResult.length > 0 ? totalCountResult[0].total : 0;
  const users = await User.aggregate(pipeline);
  const pageSize = parseInt(req.query.limit, 10) || 100;
  const currentPage = parseInt(req.query.page, 10) || 1;
  const totalPages = Math.ceil(count / pageSize);
  res.status(200).json({
    status: "success",
    currentPage,
    totalPages,
    count,
    pageSize,
    users,
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  res.status(200).json({
    status: "success",
    user,
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  await User.findByIdAndDelete(req.params.id);
  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  res.status(200).json({
    status: "success",
    user,
  });
});
