/* =========================================================
   AI Tic-Tac-Toe — Frontend Logic
   ========================================================= */

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const state = {
  board: Array(9).fill(""),
  mode: "pvc",          // pvc | pvp | cvc
  difficulty: "impossible",
  humanSymbol: "X",
  currentPlayer: "X",
  gameOver: false,
  winningLine: null,
  moveHistory: [],
  timerId: null,
  seconds: 0,
  soundOn: true,
  aiVsAiTimer: null,
};

/* --------------------------------------------------------
   Element references
   -------------------------------------------------------- */
const el = {
  setupPanel: document.getElementById("setup-panel"),
  gamePanel: document.getElementById("game-panel"),
  board: document.getElementById("board"),
  turnIndicator: document.getElementById("turn-indicator"),
  timer: document.getElementById("timer"),
  modeIndicator: document.getElementById("mode-indicator"),
  thinkingIndicator: document.getElementById("thinking-indicator"),
  scoreX: document.getElementById("score-x"),
  scoreO: document.getElementById("score-o"),
  scoreDraw: document.getElementById("score-draw"),
  moveHistory: document.getElementById("move-history"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalIcon: document.getElementById("modal-icon"),
  modalTitle: document.getElementById("modal-title"),
  modalSubtitle: document.getElementById("modal-subtitle"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  changeSetupBtn: document.getElementById("change-setup-btn"),
  resetScoresBtn: document.getElementById("reset-scores-btn"),
  modalPlayAgain: document.getElementById("modal-play-again"),
  modalChangeSetup: document.getElementById("modal-change-setup"),
  themeToggle: document.getElementById("theme-toggle"),
  soundToggle: document.getElementById("sound-toggle"),
  difficultyGroup: document.getElementById("difficulty-group"),
};

const sfx = {
  click: document.getElementById("sfx-click"),
  move: document.getElementById("sfx-move"),
  win: document.getElementById("sfx-win"),
  draw: document.getElementById("sfx-draw"),
  error: document.getElementById("sfx-error"),
};

/* --------------------------------------------------------
   Persistence (scores + preferences) — real desktop app,
   safe to use localStorage here.
   -------------------------------------------------------- */
function loadScores() {
  try {
    const raw = localStorage.getItem("ttt_scores");
    return raw ? JSON.parse(raw) : { X: 0, O: 0, Draw: 0 };
  } catch (e) {
    return { X: 0, O: 0, Draw: 0 };
  }
}

function saveScores(scores) {
  localStorage.setItem("ttt_scores", JSON.stringify(scores));
}

let scores = loadScores();

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem("ttt_prefs")) || {};
  } catch (e) {
    return {};
  }
}

function savePrefs(prefs) {
  localStorage.setItem("ttt_prefs", JSON.stringify(prefs));
}

/* --------------------------------------------------------
   Sound
   -------------------------------------------------------- */
function playSound(name) {
  if (!state.soundOn) return;
  const audio = sfx[name];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/* --------------------------------------------------------
   Ripple effect
   -------------------------------------------------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".ripple");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple-effect";
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
});

/* --------------------------------------------------------
   Setup panel interactions
   -------------------------------------------------------- */
function setupPillGroup(groupId, dataAttr, onSelect) {
  const group = document.getElementById(groupId);
  group.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    [...group.children].forEach((c) => c.classList.remove("active"));
    pill.classList.add("active");
    playSound("click");
    onSelect(pill.dataset[dataAttr]);
  });
}

setupPillGroup("mode-group", "mode", (mode) => {
  state.mode = mode;
  el.difficultyGroup.style.display = mode === "pvp" ? "none" : "block";
  document.getElementById("symbol-group").parentElement.style.display =
    mode === "pvc" ? "block" : "none";
});

setupPillGroup("difficulty-pills", "difficulty", (d) => (state.difficulty = d));
setupPillGroup("symbol-group", "symbol", (s) => (state.humanSymbol = s));

el.startBtn.addEventListener("click", () => {
  playSound("click");
  startGame();
});

el.changeSetupBtn.addEventListener("click", () => showSetup());
el.modalChangeSetup.addEventListener("click", () => {
  closeModal();
  showSetup();
});

el.restartBtn.addEventListener("click", () => {
  playSound("click");
  startGame();
});

el.modalPlayAgain.addEventListener("click", () => {
  closeModal();
  startGame();
});

el.resetScoresBtn.addEventListener("click", () => {
  scores = { X: 0, O: 0, Draw: 0 };
  saveScores(scores);
  renderScores();
  playSound("click");
});

el.themeToggle.addEventListener("click", () => {
  const body = document.body;
  const newTheme = body.dataset.theme === "dark" ? "light" : "dark";
  body.dataset.theme = newTheme;
  el.themeToggle.querySelector("i").className =
    newTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
  const prefs = loadPrefs();
  prefs.theme = newTheme;
  savePrefs(prefs);
});

el.soundToggle.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  el.soundToggle.querySelector("i").className = state.soundOn
    ? "fa-solid fa-volume-high"
    : "fa-solid fa-volume-xmark";
  const prefs = loadPrefs();
  prefs.sound = state.soundOn;
  savePrefs(prefs);
});

function applyStoredPrefs() {
  const prefs = loadPrefs();
  if (prefs.theme) {
    document.body.dataset.theme = prefs.theme;
    el.themeToggle.querySelector("i").className =
      prefs.theme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
  }
  if (typeof prefs.sound === "boolean") {
    state.soundOn = prefs.sound;
    el.soundToggle.querySelector("i").className = state.soundOn
      ? "fa-solid fa-volume-high"
      : "fa-solid fa-volume-xmark";
  }
}

/* --------------------------------------------------------
   Panel switching
   -------------------------------------------------------- */
function showSetup() {
  stopTimer();
  clearTimeout(state.aiVsAiTimer);
  el.setupPanel.hidden = false;
  el.gamePanel.hidden = true;
}

function showGame() {
  el.setupPanel.hidden = true;
  el.gamePanel.hidden = false;
}

/* --------------------------------------------------------
   Game lifecycle
   -------------------------------------------------------- */
function startGame() {
  state.board = Array(9).fill("");
  state.currentPlayer = "X";
  state.gameOver = false;
  state.winningLine = null;
  state.moveHistory = [];
  state.seconds = 0;

  const modeLabels = { pvc: "Human vs AI", pvp: "Human vs Human", cvc: "AI vs AI Demo" };
  el.modeIndicator.textContent = modeLabels[state.mode];

  renderBoard();
  renderMoveHistory();
  updateTurnIndicator();
  showGame();
  startTimer();

  if (state.mode === "cvc") {
    scheduleAiVsAiMove();
  } else if (state.mode === "pvc" && state.humanSymbol === "O") {
    requestAiMove();
  }
}

function cellIsPlayable(idx) {
  if (state.gameOver) return false;
  if (state.board[idx] !== "") return false;
  if (state.mode === "cvc") return false;
  if (state.mode === "pvc" && state.currentPlayer !== state.humanSymbol) return false;
  return true;
}

/* --------------------------------------------------------
   Rendering
   -------------------------------------------------------- */
function renderBoard() {
  el.board.innerHTML = "";
  state.board.forEach((val, idx) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = idx;
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("aria-label", `Cell ${idx + 1}`);
    if (val) {
      cell.classList.add("filled", val === "X" ? "mark-x" : "mark-o");
      cell.textContent = val;
    }
    if (!cellIsPlayable(idx) && !val) cell.classList.add("disabled");
    cell.addEventListener("click", () => onCellClick(idx));
    el.board.appendChild(cell);
  });
}

function updateTurnIndicator() {
  el.turnIndicator.textContent = state.currentPlayer;
  el.turnIndicator.style.color =
    state.currentPlayer === "X" ? "var(--blue)" : "var(--pink)";
}

function renderScores() {
  el.scoreX.textContent = scores.X;
  el.scoreO.textContent = scores.O;
  el.scoreDraw.textContent = scores.Draw;
}

function renderMoveHistory() {
  el.moveHistory.innerHTML = "";
  state.moveHistory.forEach((m) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${m.player}</span> played cell ${m.cell + 1}`;
    el.moveHistory.appendChild(li);
  });
  el.moveHistory.scrollTop = el.moveHistory.scrollHeight;
}

/* --------------------------------------------------------
   Timer
   -------------------------------------------------------- */
function startTimer() {
  stopTimer();
  el.timer.textContent = "00:00";
  state.timerId = setInterval(() => {
    state.seconds += 1;
    const m = String(Math.floor(state.seconds / 60)).padStart(2, "0");
    const s = String(state.seconds % 60).padStart(2, "0");
    el.timer.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

/* --------------------------------------------------------
   Win / draw detection (client-side mirror of backend logic)
   -------------------------------------------------------- */
function checkWinner(board) {
  for (const combo of WIN_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo };
    }
  }
  if (board.every((c) => c !== "")) return { winner: "Draw", line: null };
  return { winner: null, line: null };
}

/* --------------------------------------------------------
   Move handling
   -------------------------------------------------------- */
function onCellClick(idx) {
  if (!cellIsPlayable(idx)) {
    playSound("error");
    const cellEl = el.board.children[idx];
    if (cellEl) {
      cellEl.classList.add("shake");
      setTimeout(() => cellEl.classList.remove("shake"), 400);
    }
    return;
  }
  applyMove(idx, state.currentPlayer);

  const result = checkWinner(state.board);
  if (result.winner) {
    finishGame(result);
    return;
  }

  switchTurn();

  if (state.mode === "pvc" && state.currentPlayer !== state.humanSymbol) {
    requestAiMove();
  }
}

function applyMove(idx, player) {
  state.board[idx] = player;
  state.moveHistory.push({ player, cell: idx });
  renderMoveHistory();
  renderBoard();
  playSound("move");
  const cellEl = el.board.children[idx];
  if (cellEl) cellEl.classList.add("pop-in");
}

function switchTurn() {
  state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
  updateTurnIndicator();
}

/* --------------------------------------------------------
   AI move via backend
   -------------------------------------------------------- */
async function requestAiMove() {
  el.thinkingIndicator.hidden = false;
  const aiPlayer = state.currentPlayer;

  try {
    // Small artificial delay so the "thinking" state is perceivable
    const [response] = await Promise.all([
      fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: state.board,
          difficulty: state.difficulty,
          ai_player: aiPlayer,
        }),
      }),
      new Promise((res) => setTimeout(res, 400)),
    ]);

    if (!response.ok) throw new Error("AI move request failed");
    const data = await response.json();

    el.thinkingIndicator.hidden = true;

    if (state.gameOver) return; // user may have restarted mid-request

    applyMove(data.move, aiPlayer);

    const result = checkWinner(state.board);
    if (result.winner) {
      finishGame(result);
      return;
    }

    switchTurn();

    if (state.mode === "cvc") {
      scheduleAiVsAiMove();
    }
  } catch (err) {
    el.thinkingIndicator.hidden = true;
    console.error(err);
    playSound("error");
  }
}

function scheduleAiVsAiMove() {
  if (state.gameOver) return;
  state.aiVsAiTimer = setTimeout(() => {
    requestAiMove();
  }, 550);
}

/* --------------------------------------------------------
   Game end
   -------------------------------------------------------- */
function finishGame(result) {
  state.gameOver = true;
  state.winningLine = result.line;
  stopTimer();
  clearTimeout(state.aiVsAiTimer);
  renderBoard();

  if (result.line) {
    result.line.forEach((idx) => {
      el.board.children[idx].classList.add("win-glow");
    });
  }

  if (result.winner === "Draw") {
    scores.Draw += 1;
    playSound("draw");
  } else {
    scores[result.winner] += 1;
    playSound("win");
    launchConfetti();
  }
  saveScores(scores);
  renderScores();

  setTimeout(() => openModal(result), 500);
}

/* --------------------------------------------------------
   Modal
   -------------------------------------------------------- */
function openModal(result) {
  if (result.winner === "Draw") {
    el.modalIcon.innerHTML = '<i class="fa-solid fa-handshake"></i>';
    el.modalTitle.textContent = "It's a Draw!";
    el.modalSubtitle.textContent = "Perfectly balanced, as all things should be.";
  } else {
    el.modalIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
    el.modalTitle.textContent = `Player ${result.winner} Wins!`;
    el.modalSubtitle.textContent =
      state.mode === "cvc" ? "The AI demo round has concluded." : "Great game — play again?";
  }
  el.modalOverlay.hidden = false;
}

function closeModal() {
  el.modalOverlay.hidden = true;
}

/* --------------------------------------------------------
   Keyboard support (1-9 keys map to cells, Enter/Space activates
   focused cell, R restarts)
   -------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
  if (!el.gamePanel.hidden) {
    if (e.key >= "1" && e.key <= "9") {
      onCellClick(Number(e.key) - 1);
    } else if (e.key.toLowerCase() === "r") {
      startGame();
    }
  }
  if (document.activeElement && document.activeElement.classList.contains("cell")) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCellClick(Number(document.activeElement.dataset.index));
    }
  }
});

/* --------------------------------------------------------
   Confetti (lightweight canvas implementation, no external libs)
   -------------------------------------------------------- */
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiPieces = [];
let confettiAnimId = null;

function resizeCanvas(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas(confettiCanvas);

function launchConfetti() {
  resizeCanvas(confettiCanvas);
  const colors = ["#7f5af0", "#00e5ff", "#ff5faf", "#2cb67d", "#ffd166"];
  confettiPieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.3,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    speedY: 2 + Math.random() * 3,
    speedX: -2 + Math.random() * 4,
    rotation: Math.random() * 360,
    rotationSpeed: -6 + Math.random() * 12,
  }));

  let frames = 0;
  const maxFrames = 220;

  function animate() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      confettiCtx.restore();
    });
    frames += 1;
    if (frames < maxFrames) {
      confettiAnimId = requestAnimationFrame(animate);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  cancelAnimationFrame(confettiAnimId);
  animate();
}

/* --------------------------------------------------------
   Ambient particle background
   -------------------------------------------------------- */
const particleCanvas = document.getElementById("particle-canvas");
const particleCtx = particleCanvas.getContext("2d");
resizeCanvas(particleCanvas);

let particles = Array.from({ length: 60 }, () => ({
  x: Math.random() * particleCanvas.width,
  y: Math.random() * particleCanvas.height,
  r: 0.6 + Math.random() * 1.8,
  speedX: -0.15 + Math.random() * 0.3,
  speedY: -0.15 + Math.random() * 0.3,
  hue: Math.random() > 0.5 ? "127,90,240" : "0,229,255",
}));

function animateParticles() {
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;
    if (p.x < 0) p.x = particleCanvas.width;
    if (p.x > particleCanvas.width) p.x = 0;
    if (p.y < 0) p.y = particleCanvas.height;
    if (p.y > particleCanvas.height) p.y = 0;

    particleCtx.beginPath();
    particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    particleCtx.fillStyle = `rgba(${p.hue}, 0.55)`;
    particleCtx.fill();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();

window.addEventListener("resize", () => {
  resizeCanvas(confettiCanvas);
  resizeCanvas(particleCanvas);
});

/* --------------------------------------------------------
   Init
   -------------------------------------------------------- */
applyStoredPrefs();
renderScores();
document.getElementById("symbol-group").parentElement.style.display = "block";
