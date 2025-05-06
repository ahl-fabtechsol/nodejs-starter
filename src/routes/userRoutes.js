import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
} from "../controllers/userController.js";
import {
  guardianRequestLogin,
  guardianResetPassword,
  login,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { restrictTo } from "../middleware/restrictToMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createUser);
router.route("/login").post(login);

router.route("/").get(protect, getAllUsers);
router
  .route("/:id")
  .get(protect, getUser)
  .delete(protect, deleteUser)
  .patch(protect, updateUser);

export default router;
