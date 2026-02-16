import express from "express";
import { requireAuth } from "../middleware/clerkAuth.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

const router = express.Router();

/**
 * GET /api/auth/me
 * Frontend sends Clerk JWT in Authorization header
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { userId } = req.auth;

    // Fetch user details from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || undefined;

    let user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      const payload = { clerkUserId: userId, authProvider: "clerk" };
      if (name) payload.name = name;
      if (email) payload.email = email;

      user = await User.create(payload);
    } else {
      // Update missing fields from Clerk
      let changed = false;
      if (!user.name && name) {
        user.name = name;
        changed = true;
      }
      if (!user.email && email) {
        user.email = email;
        changed = true;
      }
      if (changed) await user.save();
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        clerkUserId: user.clerkUserId,
        name: user.name,
        email: user.email,
        civicPoints: user.civicPoints,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

/**
 * POST /api/auth/logout
 * Revoke the Clerk session server-side and return success.
 */
router.post("/logout", requireAuth, async (req, res) => {
  try {
    // Clerk's middleware provides session info on req.auth in some setups
    const sessionId = req.auth?.sessionId || req.auth?.session?.id;
    if (sessionId) {
      await clerkClient.sessions.revokeSession(sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    // Still return success false so client can handle signOut locally
    res.status(500).json({ success: false, error: "Logout failed" });
  }
});

