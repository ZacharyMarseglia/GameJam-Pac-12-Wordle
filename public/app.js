// Frontend state & UI
let teams = [];
let roundToken = null;
let startedTimer = false;
let timerId = null;
let timeLeft = 5;

const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");
const restartBtn = document.getElementById("restartBtn");
const timerEl = document.getElementById("timer");
const gridBody = document.getElementById("gridBody");
const winCard = document.getElementById("winCard");

// Fetch helpers
async function api(path, opts) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Game flow
async function init() {
  const list = await api("/api/teams");
  teams = list.map(t => t.name);
  await restartRound();
  setupAutocomplete();
}

async function restartRound() {
  const { roundToken: token } = await api("/api/random");
  roundToken = token;
  // Reset UI
  gridBody.innerHTML = "";
  winCard.classList.add("hidden");
  winCard.innerHTML = "";
  guessInput.value = "";
  guessInput.focus();
  resetTimer();
  startedTimer = false;
}

function resetTimer() {
  if (timerId) clearInterval(timerId);
  timerEl.classList.add("hidden");
  timeLeft = 5;
  timerEl.textContent = `Timer: ${timeLeft}`;
}

// Autocomplete (simple)
function setupAutocomplete() {
  guessInput.setAttribute("list", "teamsList");
  const datalist = document.createElement("datalist");
  datalist.id = "teamsList";
  teams.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    datalist.appendChild(opt);
  });
  document.body.appendChild(datalist);
}

// Normalize input team name
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Render a result row
function renderRow(teamName, result) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><span class="badgeCell">${teamName}</span></td>
    <td><span class="cell ${result.state}">${pretty(result.state)}</span></td>
    <td><span class="cell ${result.city}">${pretty(result.city)}</span></td>
    <td><span class="cell ${result.colors}">${pretty(result.colors)}</span></td>
    <td><span class="cell ${result.mascot}">${pretty(result.mascot)}</span></td>
    <td><span class="cell ${result.stadium_capacity}">${pretty(result.stadium_capacity)}</span></td>
    <td><span class="cell ${result.previous_conference}">${pretty(result.previous_conference)}</span></td>
  `;
  gridBody.prepend(tr);
}

function pretty(color) {
  if (color === "green") return "✓";
  if (color === "yellow") return "≈";
  return "×";
}

// Countdown after first guess
function startTimer() {
  if (startedTimer) return;
  startedTimer = true;
  timerEl.classList.remove("hidden");
  timeLeft = 5;
  timerEl.textContent = `Timer: ${timeLeft}`;
  timerId = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Timer: ${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      // lock row: effectively we just force focus to input for next guess
      guessInput.value = "";
      timerEl.classList.add("hidden");
      startedTimer = false; // re-start on next guess row
    }
  }, 1000);
}

// Guess handler
async function onGuess() {
  const val = guessInput.value.trim();
  if (!val) return;
  // Basic normalization + allow minor punctuation/accents differences
  const match = teams.find(t => normalize(t) === normalize(val));
  const guessName = match || val;

  const data = await api("/api/guess", {
    method: "POST",
    body: JSON.stringify({ roundToken, guessName })
  });

  renderRow(guessName, data.result);

  if (!startedTimer) startTimer();

  if (data.win) {
    showWinCard(data.answer);
    resetTimer();
  } else {
    // Prepare for next guess quickly
    guessInput.value = "";
    guessInput.focus();
  }
}

function showWinCard(ans) {
  winCard.innerHTML = `
    <h2 class="win-title">You Win! 🎉</h2>
    <div><strong>${ans.name}</strong> — ${ans.city}, ${ans.state}</div>
    <div style="margin:.5rem 0;">
      ${ans.colors.map(c => `<span class="color-chip">${c}</span>`).join(" ")}
    </div>
    <div>Mascot: ${ans.mascot}</div>
    <div>Stadium Capacity: ${ans.stadium_capacity.toLocaleString()}</div>
    <div>Previous Conference: ${ans.previous_conference}</div>
    <div style="margin-top:.75rem;">
      <button id="playAgainBtn">Play Again</button>
    </div>
  `;
  const btn = winCard.querySelector("#playAgainBtn");
  btn.addEventListener("click", restartRound);
  winCard.classList.remove("hidden");
}

// Events
guessBtn.addEventListener("click", onGuess);
guessInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onGuess();
});
restartBtn.addEventListener("click", restartRound);

// Boot
init().catch(err => {
  console.error(err);
  alert("Failed to initialize. See console.");
});
