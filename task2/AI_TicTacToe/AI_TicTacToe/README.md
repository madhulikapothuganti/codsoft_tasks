# 🎮 AI Tic-Tac-Toe — Premium Edition

A complete, from-scratch **AI-powered Tic-Tac-Toe** web app built with **Flask**
on the backend and a **premium neon glassmorphism UI** on the frontend.

The AI uses the **Minimax algorithm with Alpha-Beta Pruning**, and in
**Impossible** mode it is mathematically unbeatable — the best a human can do
is draw.

---

## ✨ Features

- **Three game modes**
  - Human vs AI
  - Human vs Human
  - AI vs AI Demo (watch two AIs battle it out automatically)
- **Four difficulty levels**
  - Easy — fully random moves
  - Medium — heuristic play (win > block > center > corner > random)
  - Hard — strong Minimax play with an occasional imperfect move (beatable)
  - Impossible — full Minimax + Alpha-Beta Pruning (**never loses**)
- Restart game / Reset scores
- Dark / Light theme toggle (persisted between sessions)
- Fully responsive design (desktop, tablet, mobile)
- Winning-line glow animation + confetti celebration
- Draw animation
- Live scoreboard (X wins / O wins / Draws), saved in the browser
- Move history log
- In-game timer
- "AI is thinking..." loading indicator
- Keyboard support (press `1`–`9` to play a cell, `R` to restart, `Enter`/`Space`
  on a focused cell)
- Sound effects for moves, wins, draws, and invalid clicks (with a mute toggle)
- Button ripple effect, smooth page/card transitions, ambient particle
  background
- Custom logo and favicon (SVG, no external image dependencies)

---

## 🧠 The AI

All AI logic lives in `app.py`:

| Difficulty  | Strategy                                                                 |
|-------------|---------------------------------------------------------------------------|
| Easy        | Picks a random empty cell.                                               |
| Medium      | Wins if possible, blocks your winning move, otherwise prefers center/corners. |
| Hard        | Uses Minimax ~75% of the time, otherwise plays randomly — strong but beatable. |
| Impossible  | Full **Minimax with Alpha-Beta Pruning** — always plays optimally. It literally cannot lose; the best possible outcome against it is a draw. |

The frontend keeps the visible board state and simply calls `POST /api/move`
with the current board, selected difficulty, and which symbol the AI is
playing. The backend computes and returns the AI's move.

---

## 🗂 Folder Structure

```
AI_TicTacToe/
│
├── app.py                 # Flask app + Minimax/Alpha-Beta AI engine
├── requirements.txt
├── README.md
│
├── templates/
│   └── index.html          # Main UI markup
│
├── static/
│   ├── css/
│   │   └── style.css        # Neon glassmorphism styling
│   ├── js/
│   │   └── script.js        # Game logic, AI calls, animations
│   ├── sounds/               # click / move / win / draw / error .wav files
│   └── images/
│       └── logo.svg          # Custom logo
│
└── screenshots/              # Add your own screenshots here
```

---

## 🚀 Installation & How to Run

**Requirements:** Python 3.11 (also works on any modern Python 3.9+)

```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Then open your browser at:

```
http://127.0.0.1:5000
```

---

## 📸 Screenshots

Add screenshots of your running app to the `screenshots/` folder and
reference them here, e.g.:

```markdown
![Setup screen](screenshots/setup.png)
![Gameplay](screenshots/gameplay.png)
![Win animation](screenshots/win.png)
```

---

## 🔮 Future Improvements

- Online multiplayer via WebSockets
- Player accounts with persistent cross-device stats
- Larger board variants (4×4, 5×5) with adjustable win length
- Difficulty auto-scaling based on player win rate
- Replay/undo system for move history
- PWA support for offline play

---

## 🛠 Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML5, CSS3 (custom properties, glassmorphism, animations),
  vanilla JavaScript (no frontend framework required)
- **AI:** Minimax algorithm with Alpha-Beta Pruning

---

Built as a showcase project combining classic game-theory AI with a modern,
premium web UI.
