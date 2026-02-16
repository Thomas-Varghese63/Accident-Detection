import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
    },
    email: String,
    name: String,
    civicPoints: {
    type: Number,
    default: 0,
    },
    authProvider: {
      type: String,
      default: "clerk",
    },
  },
  { timestamps: true }
);

export default mongoose.model("user", userSchema);
