import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  
  console.log("JWT_SECRET:", process.env.JWT_SECRET); // ← ADD THIS
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id || decoded._id,
    };
    next();
  } catch (err) {
    console.log("TOKEN ERROR:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}