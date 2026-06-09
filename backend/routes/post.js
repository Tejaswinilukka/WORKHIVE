import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import Post from "../models/Post.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads", "posts");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image and video files are allowed"));
  },
});

const uploadPostMedia = (req, res, next) => {
  upload.array("media", 5)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError || error.message.includes("Only image")) {
      return res.status(400).json(error.message);
    }

    next(error);
  });
};


// ✅ CREATE POST
router.post("/", authMiddleware, uploadPostMedia, async (req, res) => {
  try {
    const { content } = req.body;
    const trimmedContent = content?.trim() || "";
    const media = (req.files || []).map((file) => ({
      url: `/uploads/posts/${file.filename}`,
      type: file.mimetype.startsWith("image/") ? "image" : "video",
      filename: file.filename,
    }));

    if (!trimmedContent && media.length === 0) {
      return res.status(400).json("Content cannot be empty ❌");
    }

    const newPost = new Post({
      user: req.user.id,
      content: trimmedContent,
      media,
    });

    const savedPost = await newPost.save();

    const populatedPost = await savedPost.populate("user", "name email");

    res.status(201).json(populatedPost);

  } catch (error) {
    console.log("CREATE POST ERROR:", error);
    if (error instanceof multer.MulterError || error.message.includes("Only image")) {
      return res.status(400).json(error.message);
    }
    res.status(500).json("Server error ❌");
  }
});


// ✅ GET ALL POSTS (FEED)
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name email")
      .populate("comments.user", "name email")
      .sort({ createdAt: -1 });

    res.json(posts);

  } catch (error) {
    console.log("GET POSTS ERROR:", error);
    res.status(500).json("Server error ❌");
  }
});


// ✏️ EDIT POST CONTENT
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json("Post not found ❌");
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json("Not authorized to edit this post ❌");
    }

    post.content = content?.trim() ?? "";
    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name email")
      .populate("comments.user", "name email");

    res.json(updatedPost);
  } catch (error) {
    console.log("EDIT POST ERROR:", error);
    res.status(500).json("Server error ❌");
  }
});

// ❤️ LIKE / UNLIKE POST
router.put("/:id/like", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json("Post not found ❌");
    }

    const userId = req.user.id;

    if (post.likes.includes(userId)) {
      // ❌ UNLIKE
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // ❤️ LIKE
      post.likes.push(userId);
    }

    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name email")
      .populate("comments.user", "name email");

    res.json(updatedPost);

  } catch (error) {
    console.log("LIKE ERROR:", error);
    res.status(500).json("Server error ❌");
  }
});


// 💬 ADD COMMENT
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json("Comment cannot be empty ❌");
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json("Post not found ❌");
    }

    const newComment = {
      user: req.user.id,
      text,
    };

    post.comments.push(newComment);

    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name email")
      .populate("comments.user", "name email");

    res.json(updatedPost);

  } catch (error) {
    console.log("COMMENT ERROR:", error);
    res.status(500).json("Server error ❌");
  }
});


// 👀 GET COMMENTS ONLY
router.get("/:id/comments", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("comments.user", "name email");

    if (!post) {
      return res.status(404).json("Post not found ❌");
    }

    res.json(post.comments);

  } catch (error) {
    console.log("GET COMMENTS ERROR:", error);
    res.status(500).json("Server error ❌");
  }
});


export default router;
