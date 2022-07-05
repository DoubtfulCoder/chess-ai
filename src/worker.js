import { Chess } from 'chess.js';
import { countOccurences, pieceValues } from './App(2)';

// Calculates a minimax score at depth
onmessage = (msg) => {
	const startTime = performance.now();
	const { depth, isMaximizingPlayer, posMoves, gameFEN } = msg.data;
	const game = new Chess(gameFEN);
	let scores = [];

	for (let posMove of posMoves) {
		console.log('posmove', posMove);
		game.move(posMove);
		scores.push(minimax(depth - 1, !isMaximizingPlayer, 'black'));
		game.undo();
	}

	postMessage(scores);

	const endTime = performance.now();
	console.log(`Call to minmax took ${endTime - startTime} milliseconds`);

	// function minimax(depth, isMaximizingPlayer) {
	//     const possibleMoves = game.moves();

	//     if (depth === 0 || possibleMoves.length === 0) {
	//         // Terminal node (end of depth or game)
	//         return positionEval();
	//     } else if (isMaximizingPlayer) {
	//         // Computer's move
	//         let best_score = -Infinity;
	//         for (let posMove of possibleMoves) {
	//             game.move(posMove);
	//             best_score = Math.max(best_score, minimax(depth - 1, false));
	//             game.undo();
	//         }
	//         return best_score;
	//     } else {
	//         // Opponent's move
	//         let best_score = Infinity;
	//         for (let posMove of possibleMoves) {
	//             game.move(posMove);
	//             best_score = Math.min(best_score, minimax(depth - 1, true));
	//             game.undo();
	//         }
	//         return best_score;
	//     }
	// }

	function minimax(
		depth,
		isMaximizingPlayer,
		playerColor,
		alpha = Number.NEGATIVE_INFINITY,
		beta = Number.POSITIVE_INFINITY
	) {
		console.log(game.ascii());
		// Base case: evaluate board
		if (depth === 0) {
			return positionEval(playerColor);
		}

		// Recursive case: search possible moves
		let bestMove = null;
		let possibleMoves = game.moves();
		// Set a default best move value
		let bestMoveValue = isMaximizingPlayer
			? Number.NEGATIVE_INFINITY
			: Number.POSITIVE_INFINITY;
		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
			const move = possibleMoves[i];
			// Make the move, but undo before exiting loop
			game.move(move);
			// Recursively get the value from this move
			const value = minimax(
				depth - 1,
				!isMaximizingPlayer,
				playerColor,
				alpha,
				beta
			);
			// Log the value of this move
			console.log(
				isMaximizingPlayer ? 'Max: ' : 'Min: ',
				depth,
				move,
				value,
				bestMove,
				bestMoveValue
			);

			if (isMaximizingPlayer) {
				// Computer's move: maximize position
				if (value > bestMoveValue) {
					bestMoveValue = value;
					bestMove = move;
				}
				alpha = Math.max(alpha, value);
			} else {
				// Opponent's move: minimize position
				if (value < bestMoveValue) {
					bestMoveValue = value;
					bestMove = move;
				}
				beta = Math.min(beta, value);
			}
			game.undo();
			// Check for alpha beta pruning
			if (beta <= alpha) {
				console.log('Prune', alpha, beta);
				break;
			}
		}
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
