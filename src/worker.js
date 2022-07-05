import { Chess } from 'chess.js';
import { countOccurences, pieceValues } from './App';
import { moveEval } from './PositionEval';

// Calculates a minimax score at depth
onmessage = (msg) => {
	const startTime = performance.now();
	const { depth, isMaximizingPlayer, posMoves, gameFEN } = msg.data;
	const game = new Chess(gameFEN);
	// let scores = [];
    let bestEval = Number.NEGATIVE_INFINITY;
    let bestMove;

    console.log('posMoves', posMoves);

	for (let posMove of posMoves) {
		game.move(posMove);
        const squareEval = moveEval(posMove);
		const score = minimax(depth-1, false, 'black', squareEval);
        if (score > bestEval) {
            bestEval = score;
            bestMove = posMove;
        }
		game.undo();
	}

    const endTime = performance.now();
    console.log(`Call to minmax took ${(endTime - startTime)/1000} seconds`);

	postMessage([bestEval, bestMove]);

	function minimax(
		depth,
		isMaximizingPlayer,
		playerColor,
		moveEval,
		alpha = Number.NEGATIVE_INFINITY,
		beta = Number.POSITIVE_INFINITY
	) {
		// Base case: evaluate board
		if (depth === 0) {
			return positionEval(playerColor) + moveEval;
		}

		// Recursive case: search possible moves
		const possibleMoves = game.moves();
		let bestMoveValue = isMaximizingPlayer
			? Number.NEGATIVE_INFINITY
			: Number.POSITIVE_INFINITY;

		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
			const move = possibleMoves[i];
			// Make the move, but undo before exiting loop
			game.move(move);
			// Recursively get the value from this move
			const score = minimax(
				depth - 1,
				!isMaximizingPlayer,
				playerColor,
				moveEval,
				alpha,
				beta
			);

			if (isMaximizingPlayer) {
				// Computer's move: maximize position
				if (score > bestMoveValue) {
					bestMoveValue = score;
				}
				alpha = Math.max(alpha, score);
			} else {
				// Opponent's move: minimize position
				if (score < bestMoveValue) {
					bestMoveValue = score;
				}
				beta = Math.min(beta, score);
			}
			game.undo();
			// Check for alpha beta pruning
			if (beta <= alpha) {
				// console.log('Prune', alpha, beta);
				break;
			}
		}

		return bestMoveValue;
	}

	function positionEval(playerColor) {
		let position = game.fen().split(' ')[0];
		let score = 0;

		Object.keys(pieceValues).forEach((key) => {
			score += countOccurences(position, key.toUpperCase()) * pieceValues[key]; // white pieces
			score -= countOccurences(position, key) * pieceValues[key]; // black pieces
		});

		return playerColor === 'white' ? score : -score; // invert if computer is black
	}
};
