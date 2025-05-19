import express from "express";
import { generatePreSignedUrl } from "../utils/s3AwsHelpers.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/restrictToMiddleware.js";
import { updateDocuments } from "../controllers/helperController.js";

const router = express.Router();

router.route("/").post(generatePreSignedUrl);

router.route("/populate").post(protect, restrictTo("ADM"), updateDocuments);

export default router;
