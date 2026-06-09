import mongoose from "mongoose";

// 💬 Comment Schema
const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);


// 📝 Post Schema
const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true
    },
    filename: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      trim: true,
      maxlength: 500 // limit post size (good practice)
    },
    media: {
      type: [mediaSchema],
      default: []
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    comments: {
      type: [commentSchema],
      default: []
    }
  },
  { timestamps: true }
);


// 🚀 Export Model
export default mongoose.model("Post", postSchema);
