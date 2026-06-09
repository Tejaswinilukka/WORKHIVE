import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    members:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status:      { type: String, enum: ["pending", "accepted"], default: "pending" },
    requester:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: { text: String, createdAt: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);