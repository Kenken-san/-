// Minimal "Sign in with Google" backend for account creation.
// Pattern: frontend gets a Google ID token, backend verifies it, then
// upserts a user and issues our own session cookie (signed JWT).

import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { upsertUser, getUser } from "./db.js";

const {
  GOOGLE_CLIENT_ID,
  SESSION_SECRET,
  PORT = 3000,
} = process.env;

if (!GOOGLE_CLIENT_ID || !SESSION_SECRET) {
  throw new Error("Set GOOGLE_CLIENT_ID and SESSION_SECRET in your .env");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// --- Sign in / create account ---------------------------------------------
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body; // the ID token from Google Identity Services
    if (!credential) return res.status(400).json({ error: "Missing credential" });

    // Verify signature + audience. Throws if the token is forged or for another app.
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();

    // Require a verified email before creating an account.
    if (!p.email_verified) {
      return res.status(403).json({ error: "Google email not verified" });
    }

    // Create the account if new, otherwise return existing. google_sub is the
    // stable unique user id from Google — key on this, NOT on email (emails can change).
    const user = await upsertUser({
      google_sub: p.sub,
      email: p.email,
      name: p.name,
      picture: p.picture,
    });

    // Issue our own session so we don't re-hit Google on every request.
    const session = jwt.sign({ uid: user.id }, SESSION_SECRET, { expiresIn: "30d" });
    res.cookie("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ user, isNew: user.isNew });
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// --- Who am I (reads our session cookie) -----------------------------------
app.get("/api/me", async (req, res) => {
  try {
    const { uid } = jwt.verify(req.cookies.session, SESSION_SECRET);
    const user = await getUser(uid);
    if (!user) return res.status(401).json({ error: "Not found" });
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Not signed in" });
  }
});

// --- Logout ----------------------------------------------------------------
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
