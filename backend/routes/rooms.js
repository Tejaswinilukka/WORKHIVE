import express from "express";
import Room from "../models/Room.js";
import Artifact from "../models/Artifact.js";
import jwtMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

// GET /api/rooms?status=active&tags=React
router.get("/", async (req, res) => {
  try {
    const { status, tags } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tags) filter.tags = { $in: tags.split(",") };

    const rooms = await Room.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("createdBy", "name profileImage")
      .populate("collaborators.userId", "name profileImage")
      .lean();
    if (!room) return res.status(404).json({ error: "Not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", jwtMiddleware, async (req, res) => {
  try {
    const payload = req.body;
    payload.createdBy = req.user.id;
    const room = await Room.create(payload);
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/join", jwtMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const already = room.collaborators.find((c) => c.userId.toString() === req.user.id);
    if (!already) {
      room.collaborators.push({ userId: req.user.id, joinedAt: new Date() });
      room.status = room.status === "open" ? "active" : room.status;
      await room.save();
    }

    res.json({ ok: true, room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/content", jwtMiddleware, async (req, res) => {
  try {
    const { content, progress } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const isMember = room.collaborators.some((c) => c.userId.toString() === req.user.id) || room.createdBy?.toString() === req.user.id;
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    if (typeof content === "string") room.content = content;
    if (typeof progress === "number") room.progress = progress;
    await room.save();

    // broadcast via io if available
    const io = req.app.get("io");
    io?.to(`room:${room._id}`).emit("content-update", { roomId: room._id, content: room.content, progress: room.progress });

    res.json({ ok: true, room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/publish", jwtMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // create artifact
    const collaborators = room.collaborators.map((c) => c.userId.toString());
    if (!collaborators.includes(room.createdBy?.toString())) collaborators.push(room.createdBy?.toString());

    const artifact = await Artifact.create({
      roomId: room._id,
      title: room.title,
      outputType: room.outputType,
      content: room.content,
      tags: room.tags,
      collaborators,
      wordCount: room.content ? room.content.split(/\s+/).filter(Boolean).length : 0,
      verifiedAt: new Date(),
    });

    room.status = "completed";
    room.publishedAt = new Date();
    await room.save();

    // Optionally update users — here we just emit event
    const io = req.app.get("io");
    io?.to(`room:${room._id}`).emit("room-published", artifact);

    res.json({ ok: true, artifact });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
