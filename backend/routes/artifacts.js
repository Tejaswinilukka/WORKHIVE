import express from "express";
import Artifact from "../models/Artifact.js";

const router = express.Router();

router.get("/id/:artifactId", async (req, res) => {
  try {
    const artifact = await Artifact.findById(req.params.artifactId).lean();
    if (!artifact) return res.status(404).json({ error: "Artifact not found" });
    res.json(artifact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const artifacts = await Artifact.find({ collaborators: req.params.userId }).sort({ createdAt: -1 }).lean();
    res.json(artifacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
