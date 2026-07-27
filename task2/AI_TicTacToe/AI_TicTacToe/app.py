"""
AI Tic-Tac-Toe - Flask Backend
--------------------------------
Implements four AI difficulty levels:
    - Easy       : Completely random moves.
    - Medium     : Simple heuristics (win > block > center > corner > random).
    - Hard       : Minimax with a chance of a sub-optimal move (beatable).
    - Impossible : Full Minimax + Alpha-Beta Pruning (never loses).

The frontend (vanilla JS) owns the visible board state and simply asks
this backend "given this board, what should the AI play next?".
"""

import math
import random

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Game constants
# ---------------------------------------------------------------------------

WIN_COMBOS = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),   # rows
    (0, 3, 6), (1, 4, 7), (2, 5, 8),   # columns
    (0, 4, 8), (2, 4, 6),              # diagonals
]

VALID_DIFFICULTIES = {"easy", "medium", "hard", "impossible"}
VALID_MARKS = {"X", "O", ""}


# ---------------------------------------------------------------------------
# Core game logic
# ---------------------------------------------------------------------------

def check_winner(board):
    """Return 'X', 'O', 'Draw', or None (game still in progress)."""
    for a, b, c in WIN_COMBOS:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    if "" not in board:
        return "Draw"
    return None


def empty_cells(board):
    return [i for i, v in enumerate(board) if v == ""]


def find_winning_move(board, player):
    """Return an index that lets `player` win immediately, or None."""
    for i in empty_cells(board):
        board[i] = player
        won = check_winner(board) == player
        board[i] = ""
        if won:
            return i
    return None


def minimax(board, depth, is_maximizing, ai_player, human_player, alpha, beta):
    winner = check_winner(board)
    if winner == ai_player:
        return 10 - depth
    if winner == human_player:
        return depth - 10
    if winner == "Draw":
        return 0

    if is_maximizing:
        best = -math.inf
        for i in empty_cells(board):
            board[i] = ai_player
            score = minimax(board, depth + 1, False, ai_player, human_player, alpha, beta)
            board[i] = ""
            best = max(best, score)
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best
    else:
        best = math.inf
        for i in empty_cells(board):
            board[i] = human_player
            score = minimax(board, depth + 1, True, ai_player, human_player, alpha, beta)
            board[i] = ""
            best = min(best, score)
            beta = min(beta, best)
            if beta <= alpha:
                break
        return best


def get_best_move(board, ai_player, human_player):
    """Perfect play via Minimax + Alpha-Beta Pruning. Never loses."""
    best_score = -math.inf
    best_move = None
    for i in empty_cells(board):
        board[i] = ai_player
        score = minimax(board, 0, False, ai_player, human_player, -math.inf, math.inf)
        board[i] = ""
        if score > best_score:
            best_score = score
            best_move = i
    return best_move


def get_medium_move(board, ai_player, human_player):
    # 1. Win if possible.
    move = find_winning_move(board, ai_player)
    if move is not None:
        return move
    # 2. Block opponent's winning move.
    move = find_winning_move(board, human_player)
    if move is not None:
        return move
    # 3. Take center.
    if board[4] == "":
        return 4
    # 4. Take a corner.
    corners = [c for c in (0, 2, 6, 8) if board[c] == ""]
    if corners:
        return random.choice(corners)
    # 5. Anything left.
    return random.choice(empty_cells(board))


def get_ai_move(board, difficulty, ai_player, human_player):
    cells = empty_cells(board)
    if not cells:
        return None

    if difficulty == "easy":
        return random.choice(cells)

    if difficulty == "medium":
        return get_medium_move(board, ai_player, human_player)

    if difficulty == "hard":
        # Strong but beatable: mostly optimal, occasionally imperfect.
        if random.random() < 0.75:
            return get_best_move(board, ai_player, human_player)
        return random.choice(cells)

    # "impossible" (and any unrecognised value falls back to perfect play)
    return get_best_move(board, ai_player, human_player)


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validate_board(board):
    if not isinstance(board, list) or len(board) != 9:
        return False
    return all(cell in VALID_MARKS for cell in board)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/move", methods=["POST"])
def api_move():
    data = request.get_json(silent=True) or {}

    board = data.get("board")
    difficulty = data.get("difficulty", "impossible")
    ai_player = data.get("ai_player", "O")

    if not validate_board(board):
        return jsonify({"error": "Invalid board. Must be a list of 9 cells ('', 'X', or 'O')."}), 400

    if difficulty not in VALID_DIFFICULTIES:
        return jsonify({"error": f"Invalid difficulty. Must be one of {sorted(VALID_DIFFICULTIES)}."}), 400

    if ai_player not in ("X", "O"):
        return jsonify({"error": "ai_player must be 'X' or 'O'."}), 400

    human_player = "O" if ai_player == "X" else "X"

    if check_winner(board) is not None:
        return jsonify({"error": "Game is already over."}), 400

    board_copy = list(board)
    move = get_ai_move(board_copy, difficulty, ai_player, human_player)

    if move is None:
        return jsonify({"error": "No moves available."}), 400

    board_copy[move] = ai_player
    winner = check_winner(board_copy)

    return jsonify({
        "move": move,
        "board": board_copy,
        "winner": winner,
    })


@app.route("/api/check", methods=["POST"])
def api_check():
    """Utility endpoint the frontend can use to double check win/draw state."""
    data = request.get_json(silent=True) or {}
    board = data.get("board")

    if not validate_board(board):
        return jsonify({"error": "Invalid board."}), 400

    return jsonify({"winner": check_winner(board)})


if __name__ == "__main__":
    app.run(debug=True)
