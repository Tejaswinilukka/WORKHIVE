import mongoose from "mongoose";

const artifactSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    title: { type: String, required: true },
    outputType: { type: String },
    content: { type: String },
    tags: [String],
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    wordCount: { type: Number, default: 0 },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Artifact", artifactSchema);
