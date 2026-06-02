import express       from "express";
import { authMiddleware } from "../middlewares/jwt.js";
import Notification  from "../models/Notification.js";

const notificationRouter = express.Router();

// ── GET /api/notifications  — fetch my notifications (latest 30) ───────────
notificationRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({
      status: "success",
      unreadCount,
      count:  notifications.length,
      data:   notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// ── PATCH /api/notifications/:id/read  — mark one as read ─────────────────
notificationRouter.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    return res.json({ status: "success", data: notification });
  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// ── PATCH /api/notifications/read-all  — mark all as read ─────────────────
notificationRouter.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, isRead: false },
      { isRead: true }
    );

    return res.json({ status: "success", message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

export default notificationRouter;