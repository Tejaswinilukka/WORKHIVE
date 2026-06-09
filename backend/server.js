import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import postRoutes from "./routes/post.js";
import messageRoutes from "./routes/message.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";
import Room from "./models/Room.js";
import Artifact from "./models/Artifact.js";
import User from "./models/User.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());
app.set("io", io);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/messages", messageRoutes);
import roomsRouter from "./routes/rooms.js";
import artifactsRouter from "./routes/artifacts.js";

app.use("/api/rooms", roomsRouter);
app.use("/api/artifacts", artifactsRouter);

app.get("/", (req, res) => res.send("WorkHive API Running"));

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  const dbUser = await User.findById(socket.user.id, "name profileImage").lean();
  if (dbUser) {
    socket.user.name = dbUser.name;
    socket.user.profileImage = dbUser.profileImage;
  }

  socket.join(`user:${socket.user.id}`);

  // room collaboration handlers
  socket.on("join-room", async (roomId, ack) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) throw new Error("Room not found");

      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit("user-joined", { user: socket.user });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("content-update", (roomId, content) => {
    socket.to(`room:${roomId}`).emit("content-update", { roomId, content });
  });

  socket.on("cursor-update", ({ roomId, selectionStart, selectionEnd } = {}) => {
    if (!roomId) return;
    socket.to(`room:${roomId}`).emit("cursor-update", {
      user: socket.user,
      selectionStart,
      selectionEnd,
    });
  });

  socket.on("user-typing", ({ roomId } = {}) => {
    if (!roomId) return;
    socket.to(`room:${roomId}`).emit("user-typing", { user: socket.user });
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit("user-left", { user: socket.user });
  });

  socket.on("conversation:join", async (conversationId, ack) => {
    try {
      const conv = await Conversation.findOne({
        _id: conversationId,
        members: socket.user.id,
        status: "accepted",
      });

      if (!conv) throw new Error("Conversation not found");

      socket.join(`conversation:${conversationId}`);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("message:send", async ({ conversationId, text, clientId } = {}, ack) => {
    try {
      const cleanText = text?.trim();
      if (!cleanText) throw new Error("Message cannot be empty");

      const conv = await Conversation.findOne({
        _id: conversationId,
        members: socket.user.id,
        status: "accepted",
      });

      if (!conv) throw new Error("Conversation not found");

      const msg = await Message.create({
        conversationId,
        sender: socket.user.id,
        text: cleanText,
      });

      const lastMessage = { text: cleanText, createdAt: msg.createdAt };
      conv.lastMessage = lastMessage;
      await conv.save();

      const payload = { ...msg.toObject(), clientId };
      io.to(`conversation:${conversationId}`).emit("message:new", payload);
      conv.members.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("conversation:updated", {
          conversationId,
          lastMessage,
        });
      });

      ack?.({ ok: true, message: payload });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });
});

mongoose
  .connect("mongodb://localhost:27017/workhive", {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

server.listen(5000, () => console.log("Server running on port 5000"));
