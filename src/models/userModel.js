import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [false, "Name is Required"],
      default: null,
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
      unique: [true, "Email already exists"],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      required: [true, "Password is Required"],
      select: false,
    },
    phone: {
      type: String,
      required: [false, "Phone is Required"],
      default: null,
    },
    image: {
      type: String,
      required: [false, "Profile Image is Required"],
      default: null,
    },
    verfied: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["A", "I", "S"], // A = Active, I = Inactive, S = Suspended
      default: "A",
    },
    role: {
      type: String,
      enum: ["AD", "S", "B", "M"], // AD = Admin, S = Seller, B = Buyer, M = Manager
      default: "B",
    },
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SellerStore",
      },
    ],
    whishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
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
