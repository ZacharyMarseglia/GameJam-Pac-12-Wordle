import express from "express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import { nanoid } from "nanoid";
import { compareGuess } from "./lib/compare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const COOKIE_SECRET = process.env.COOKIE_SECRET || "devsecret";

// Security

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "script-src": ["'self'"],                // module script /app.js is fine
      "style-src": ["'self'", "'unsafe-inline'"] // <-- allow your <style> tag
    }
  }
}));



app.disable("x-powered-by");

// Rate limit (simple)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
});
app.use(limiter);

// JSON parsing for guess endpoint
app.use(express.json());

// Cookies
app.use(cookieParser(COOKIE_SECRET));

// Data load (in-memory)
const TEAMS_PATH = path.join(__dirname, "data", "teams.json");
const TEAMS = JSON.parse(fs.readFileSync(TEAMS_PATH, "utf-8"));

// Round store: token -> answer index
// In-memory, ephemeral by design
const rounds = new Map();

// Serve static
app.use(express.static(path.join(__dirname, "public")));

// API: teams list
app.get("/api/teams", (req, res) => {
  // Don’t leak indices or anything extra
  res.json(TEAMS.map(t => ({
    id: t.id,
    name: t.name
  })));
});

// API: random (start or reset round)
// Returns a roundToken (also stored in signed cookie)
app.get("/api/random", (req, res) => {
  const token = nanoid(12);
  const answerIndex = Math.floor(Math.random() * TEAMS.length);
  rounds.set(token, { answerIndex, createdAt: Date.now() });

  res.cookie("roundToken", token, {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    maxAge: 1000 * 60 * 30 // 30 min
  });
  res.json({ roundToken: token });
});

// API: guess -> returns comparison feedback
app.post("/api/guess", (req, res) => {
  const token = req.signedCookies.roundToken || req.body.roundToken;
  const { guessName } = req.body;

  if (!token || !rounds.has(token)) {
    return res.status(400).json({ error: "Round not initialized. Call /api/random." });
  }
  if (!guessName || typeof guessName !== "string") {
    return res.status(400).json({ error: "Missing guessName." });
  }

  const round = rounds.get(token);
  const answer = TEAMS[round.answerIndex];

  // Find guessed team by normalized name
  const norm = s => s.toLowerCase().replace(/[\s’'`.-]/g, "");
  const guessed = TEAMS.find(t => norm(t.name) === norm(guessName));
  if (!guessed) {
    return res.status(404).json({ error: "Team not found in dataset." });
  }

  const result = compareGuess(guessed, answer);

  const isWin = result.overall === "win";
  if (isWin) {
    // Provide answer card; keep the same token so player can restart explicitly
    res.json({
      result,
      win: true,
      answer: {
        name: answer.name,
        state: answer.state,
        city: answer.city,
        colors: answer.colors,
        mascot: answer.mascot,
        stadium_capacity: answer.stadium_capacity,
        previous_conference: answer.previous_conference
      }
    });
  } else {
    res.json({ result, win: false });
  }
});

app.get("/healthz", (req, res) => res.send("ok"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`PAC-12 Wordle running on http://localhost:${PORT}`);
});
