import express from "express";
import auth from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

const router = express.Router();

const populateMembers = "name email";
const userRoom = (id) => `user:${id}`;
const conversationRoom = (id) => `conversation:${id}`;

router.get("/", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({
      members: req.user.id,
      status: "accepted",
    })
      .populate("members", populateMembers)
      .sort({ "lastMessage.createdAt": -1, updatedAt: -1 });

    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/requests", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({
      members: req.user.id,
      status: "pending",
      requester: { $ne: req.user.id },
    })
      .populate("members", populateMembers)
      .sort({ createdAt: -1 });

    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/request/:userId", auth, async (req, res) => {
  try {
    const existing = await Conversation.findOne({
      members: { $all: [req.user.id, req.params.userId] },
    });
    if (existing) return res.status(400).json({ error: "Already exists" });

    const conv = await Conversation.create({
      members: [req.user.id, req.params.userId],
      status: "pending",
      requester: req.user.id,
    });

    const populated = await conv.populate("members", populateMembers);
    req.app.get("io")?.to(userRoom(req.params.userId)).emit("request:new", populated);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/accept/:id", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOneAndUpdate(
      {
        _id: req.params.id,
        members: req.user.id,
        requester: { $ne: req.user.id },
        status: "pending",
      },
      { status: "accepted" },
      { new: true }
    ).populate("members", populateMembers);

    if (!conv) return res.status(404).json({ error: "Request not found" });

    const io = req.app.get("io");
    conv.members.forEach((member) => {
      io?.to(userRoom(member._id)).emit("conversation:accepted", conv);
    });

    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/reject/:id", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOneAndDelete({
      _id: req.params.id,
      members: req.user.id,
      requester: { $ne: req.user.id },
      status: "pending",
    });

    if (!conv) return res.status(404).json({ error: "Request not found" });

    req.app.get("io")?.to(userRoom(conv.requester)).emit("request:rejected", {
      conversationId: conv._id,
    });

    res.json({ message: "Rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/send", auth, async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const cleanText = text?.trim();
    if (!cleanText) return res.status(400).json({ error: "Message cannot be empty" });

    const conv = await Conversation.findOne({
      _id: conversationId,
      members: req.user.id,
      status: "accepted",
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msg = await Message.create({
      conversationId,
      sender: req.user.id,
      text: cleanText,
    });

    const lastMessage = { text: cleanText, createdAt: msg.createdAt };
    conv.lastMessage = lastMessage;
    await conv.save();

    const io = req.app.get("io");
    io?.to(conversationRoom(conversationId)).emit("message:new", msg);
    conv.members.forEach((memberId) => {
      io?.to(userRoom(memberId)).emit("conversation:updated", {
        conversationId,
        lastMessage,
      });
    });

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:convId", auth, async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.convId,
      members: req.user.id,
      status: "accepted",
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const msgs = await Message.find({
      conversationId: req.params.convId,
    }).sort("createdAt");

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
