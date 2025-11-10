// Comparison helpers for server-side result scoring

// Simple normalization
const norm = s => (s || "").toLowerCase().normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "") // strip accents
  .replace(/[^a-z0-9 ]/g, "")
  .trim();

// Very lightweight Levenshtein
export function levenshtein(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (m === 0) return n; if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// Fuzzy color synonyms
const COLOR_SYNONYMS = {
  crimson: ["red", "cardinal", "garnet"],
  scarlet: ["red"],
  gray: ["grey", "silver"],
  blue: ["royal", "navy", "azure", "cobalt"],
  gold: ["yellow"],
  orange: ["tangerine"]
};

function expandColor(c) {
  const base = norm(c);
  const set = new Set([base]);
  for (const [k, vals] of Object.entries(COLOR_SYNONYMS)) {
    if (base === k || vals.includes(base)) {
      set.add(k);
      vals.forEach(v => set.add(v));
    }
  }
  return set;
}

function colorsOverlap(guessColors, answerColors) {
  const gSets = guessColors.map(expandColor);
  const aSets = answerColors.map(expandColor);
  for (const gs of gSets) {
    for (const as of aSets) {
      for (const g of gs) if (as.has(g)) return true;
    }
  }
  return false;
}

function colorsExactSet(guessColors, answerColors) {
  const g = new Set(guessColors.map(c => norm(c)));
  const a = new Set(answerColors.map(c => norm(c)));
  if (g.size !== a.size) return false;
  for (const x of g) if (!a.has(x)) return false;
  return true;
}

function mascotClose(ga, aa) {
  // Common root match like "Bronco" vs "Broncos"
  const g = norm(ga).replace(/s$/, "");
  const a = norm(aa).replace(/s$/, "");
  return g === a;
}

export function compareGuess(guess, answer) {
  const out = {
    state: "red",
    city: "red",
    colors: "red",
    mascot: "red",
    stadium_capacity: "red",
    previous_conference: "red",
    overall: "continue"
  };

  // State
  out.state = norm(guess.state) === norm(answer.state) ? "green" : "red";

  // City (green exact, yellow if Levenshtein <= 2)
  if (norm(guess.city) === norm(answer.city)) out.city = "green";
  else if (levenshtein(guess.city, answer.city) <= 2) out.city = "yellow";

  // Colors (green exact set, yellow any overlap including synonyms)
  if (colorsExactSet(guess.colors, answer.colors)) out.colors = "green";
  else if (colorsOverlap(guess.colors, answer.colors)) out.colors = "yellow";

  // Mascot (exact green, plural-root yellow)
  if (norm(guess.mascot) === norm(answer.mascot)) out.mascot = "green";
  else if (mascotClose(guess.mascot, answer.mascot)) out.mascot = "yellow";

  // Stadium capacity (green exact, yellow within ±10%)
  if (guess.stadium_capacity === answer.stadium_capacity) out.stadium_capacity = "green";
  else {
    const g = guess.stadium_capacity;
    const a = answer.stadium_capacity;
    if (Math.abs(g - a) / a <= 0.10) out.stadium_capacity = "yellow";
  }

  // Previous conference (exact only)
  out.previous_conference =
    norm(guess.previous_conference) === norm(answer.previous_conference)
      ? "green"
      : "red";

  const allGreen = Object.entries(out)
    .filter(([k]) => k !== "overall")
    .every(([_, v]) => v === "green");
  out.overall = allGreen ? "win" : "continue";
  return out;
}
