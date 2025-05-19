import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
} from "../controllers/userController.js";
import {
  adminResetPassword,
  forgotPassword,
  login,
  refreshAccessToken,
  resetPassword,
  verifyResetCode,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/restrictToMiddleware.js";

const router = express.Router();

router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword").post(resetPassword);
router.route("/verifyResetCode").post(verifyResetCode);
router
  .route("/adminResetPassword/:id")
  .post(protect, restrictTo("AD"), adminResetPassword);

router.route("/refreshToken").post(refreshAccessToken);
router.route("/signup").post(createUser);
router.route("/login").post(login);

router.route("/").get(protect, restrictTo("AD"), getAllUsers);
router
  .route("/:id")
  .get(protect, restrictTo("AD", "B", "S"), getUser)
  .delete(protect, restrictTo("AD"), deleteUser)
  .patch(protect, restrictTo("AD", "B", "S"), updateUser);

export default router;
