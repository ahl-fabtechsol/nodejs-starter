import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/userModel.js";

export const updateDocuments = catchAsync(async (req, res, next) => {
  const id = new mongoose.Types.ObjectId("67f3bd8a48c0b08ef5d8e9aa");
  await User.updateMany({}, [{ $set: { grade: id } }]);

  console.log("Documents updated successfully");
  res.status(200).json({ status: "success" });
});
