import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads", "profiles");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image files are allowed"));
  },
});

const uploadProfileImage = (req, res, next) => {
  upload.single("profileImage")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError || error.message.includes("Only image")) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  });
};

router.get("/search", auth, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const filter = { _id: { $ne: req.user.id } };

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    const users = await User.find(filter)
      .select("name email profileImage")
      .limit(15);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/me/profile-image", auth, uploadProfileImage, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Profile image is required" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: `/uploads/profiles/${req.file.filename}` },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
