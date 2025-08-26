// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const extractToken = (req) => {
  // Authorization: Bearer <token>
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);

  // Optional: x-access-token header
  if (req.headers["x-access-token"]) return String(req.headers["x-access-token"]);

  // Optional: cookie named "token"
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);

  return null;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    console.log(token);
    
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 5 });
    const userId = payload.sub || payload.id;
    const user = await User.findById(userId);

    if (!user || user.isDeleted || user.status !== "active") {
      return res.status(401).json({ error: "Invalid user" });
    }

    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    next();
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "TokenExpired" });
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
