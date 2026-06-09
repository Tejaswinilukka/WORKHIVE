import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    outputType: { type: String, enum: ["document", "brief", "pitch", "code"], default: "document" },
    tags: [String],
    visibility: { type: String, enum: ["open", "invite"], default: "open" },
    status: { type: String, enum: ["active", "open", "completed"], default: "open" },
    collaborators: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: Date,
      },
    ],
    content: { type: String, default: "" },
    progress: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    publishedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
