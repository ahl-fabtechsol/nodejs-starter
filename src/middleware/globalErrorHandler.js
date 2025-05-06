import logger from "../utils/logger.js";
import fs from "fs";
import { clearUploadsFolder } from "./uploadMiddleware.js";

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data: ${errors.join(". ")}`;

    logger.warn(message);

    if (req.file) {
      clearUploadsFolder();
    }

    return res.status(400).json({
      status: "fail",
      message,
    });
  }

  if (err.isOperational) {
    logger.error(`Operational error: ${err.message}`);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  logger.error(`Unexpected error: ${err.message} - Stack: ${err.stack}`);
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong!",
  });
};

export default globalErrorHandler;
