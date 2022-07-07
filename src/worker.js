import { Chess } from 'chess.js';
import { countOccurences, isQuietMove, pieceValues } from './App';
import { moveEval, sortMoves } from './PositionEval';

// Calculates a minimax score at depth
onmessage = (msg) => {
	const startTime = performance.now();
	const { depth, quiescenceDepth, posMoves, gameFEN, alpha } = msg.data;
	const game = new Chess(gameFEN);
	// let scores = [];
    let bestEval = Number.NEGATIVE_INFINITY;
    let bestMove;

    console.log('posMoves', posMoves);

	for (let posMove of posMoves) {
		game.move(posMove);
        const squareEval = moveEval(posMove);
		const score = minimax(depth-1, false, 'black', squareEval, posMove, alpha);
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
		depth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
		alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY
	) {
		// Base case: evaluate board
		if (depth === 0) {
            // check for quiet moves (non-captures)
            if (isQuietMove(mostRecentMove)) {
			    return positionEval(playerColor) + moveEval;
            } else {
                const quiescence = quiescenceSearch(
                    quiescenceDepth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
                    alpha, beta
                );
				return quiescence;
            }
		}

		// Recursive case: search possible moves
		let possibleMoves = game.moves();
		possibleMoves = sortMoves(game, possibleMoves);
        let bestMoveValue = isMaximizingPlayer
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY;

		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
			const move = possibleMoves[i];
			// if (!isQuietMove(move)) {
				// console.log(move, 'NOT QUIET. CAPTURE EVAL: ', getCaptureValue(game, move));
				// console.log(game.ascii());
			// }
			// Make the move, but undo before exiting loop
			game.move(move);
			// Recursively get the value from this move
			const score = minimax(depth-1, !isMaximizingPlayer, playerColor, moveEval, move, alpha, beta);

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

	function quiescenceSearch(
		depth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
		alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY
	) {
		const evaluation = positionEval(playerColor) + moveEval;
		// fail-hard beta cutoff
		if (evaluation >= beta)
		{
			// node (move) fails high
			return beta;
		}

        // console.log('Quiescence search', mostRecentMove);
		// Base case: evaluate board
		if (isQuietMove(mostRecentMove) || depth === 0) {
            // console.log('Quiescence search', mostRecentMove);
			return positionEval(playerColor) + moveEval;
		}

		// Recursive case: search possible moves
		let possibleMoves = game.moves();
		// console.log('presort', possibleMoves);
		// const startTime = performance.now();
		possibleMoves = sortMoves(game, possibleMoves);
		// const endTime = performance.now();
		// sortingTime += endTime - startTime;
		// console.log('postsort', possibleMoves);
        let bestMoveValue = isMaximizingPlayer
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY;

		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
			const move = possibleMoves[i];
			// Make the move, but undo before exiting loop
			game.move(move);
			// Recursively get the value from this move
			const score = quiescenceSearch(depth-1, !isMaximizingPlayer, playerColor, moveEval, move, alpha, beta);

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
