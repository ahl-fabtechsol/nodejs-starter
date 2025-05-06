import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [false, "First Name is Required"],
      default: null,
    },
    lastName: {
      type: String,
      required: false,
      default: null,
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
      unique: [true, "Email already exists"],
    },
    refreshToken: {
      type: String,
      default: null,
    },
    resetCode: {
      type: String,
    },
    resetCodeExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }

  next();
});

const User = mongoose.model("User", UserSchema);
export default User;
