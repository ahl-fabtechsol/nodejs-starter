import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import AppError from "../utils/appError.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.NODE_ENV === "deployment" ? "/tmp" : "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      clearUploadsFolder();
      return next(new AppError(`File size exceeds the limit of ${5}MB.`, 400));
    }
  } else if (err.message === "Invalid file type. Only images are allowed!") {
    clearUploadsFolder();
    return next(new AppError(err.message, 400));
  }
  next(err);
};

export const clearUploadsFolder = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadDir =
    process.env.NODE_ENV === "deployment"
      ? "/tmp"
      : path.join(__dirname, "../../uploads");
  if (fs.existsSync(uploadDir)) {
    fs.readdirSync(uploadDir).forEach((file) => {
      const filePath = path.join(uploadDir, file);
      fs.unlinkSync(filePath);
    });
  }
};

export default upload;
