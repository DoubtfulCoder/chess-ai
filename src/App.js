import { Chess } from 'chess.js';
import { useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { moveEval } from './PositionEval';

// console.log('Qd6', moveEval('Qd6', 'black'));
console.log('Number of threads on your device: ', navigator.hardwareConcurrency);

const numThreads = navigator.hardwareConcurrency;

export const pieceValues = {
	p: 1,
	n: 3,
	b: 3,
	r: 5,
	q: 9,
};

/* Counts number of occorunces of substr in str */
export function countOccurences(str, substr) {
	return str.split(substr).length - 1;
}

/* checks if all values in an array are defined */
function allDefined(arr) {
	for (let member of arr) {
		if (member === undefined) {
			return false;
		}
	}
	return true;
}

/* returns whether a move is quiet (a non-capture) or not */
export function isQuietMove(move) {
    return !move.includes('x');
}

export default function App({ boardWidth }) {
	const chessboardRef = useRef();
	const [game, setGame] = useState(new Chess());
    const [isFirstMove, setIsFirstMove] = useState(true);
	const [arrows, setArrows] = useState([]);
	const [boardOrientation, setBoardOrientation] = useState('white');
	const [currentTimeout, setCurrentTimeout] = useState(undefined);

	function safeGameMutate(modify) {
		setGame((g) => {
			const update = { ...g };
			modify(update);
			return update;
		});
	}

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
                return quiescenceSearch(
                    2, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
                    alpha, beta
                );
            }
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

    // does additional analysis on "non-quiet" moves i.e. captures
    function quiescenceSearch(
		depth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
		alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY
	) {
        console.log('Quiescence search', mostRecentMove);
		// Base case: evaluate board
		if (isQuietMove(mostRecentMove) || depth === 0) {
            // console.log('Quiescence search', mostRecentMove);
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

	function computerMove() {
        if (isFirstMove) {
            game.move('d5');
            setIsFirstMove(false);
            return;
        }
        const startTime = performance.now();

		const possibleMoves = game.moves();
		const workers = [];
		// Most moves evaluated on 3 threads with remainder on main thread
		const workerChunk = Math.floor(possibleMoves.length / numThreads);
		const mainThreadStart = workerChunk * numThreads;
		let numWorkersDone = 0;

		let bestEval = Number.NEGATIVE_INFINITY;
		let bestMove;

		for (let i = 0; i < numThreads; i++) {
			workers[i] = new Worker(new URL('./worker.js', import.meta.url));
			workers[i].postMessage({
				depth: 4,
				isMaximizingPlayer: true,
				posMoves: possibleMoves.slice(i * workerChunk, (i + 1) * workerChunk),
				gameFEN: game.fen(),
			});
			// eslint-disable-next-line no-loop-func
			workers[i].onmessage = (msg) => {
				numWorkersDone++;

				const msgEval = msg.data[0];
				const msgMove = msg.data[1];
				if (msgEval > bestEval) {
					bestEval = msgEval;
					bestMove = msgMove;
				}

                // check if all workers done
				if (numWorkersDone === numThreads) {
					console.log('bestmove', bestEval, bestMove);
					safeGameMutate((g) => g.move(bestMove));
                    
                    // log total time taken
                    const endTime = performance.now();
		            console.log(`TOTAL TIME took ${(endTime - startTime)/1000} seconds`);
				}
			};
		}

		// Finish last few moves on main thread
		// const startTime = performance.now();
		for (let i = mainThreadStart; i < possibleMoves.length; i++) {
			const posMove = possibleMoves[i];
			game.move(posMove);
			const squareEval = moveEval(posMove);
			const score = minimax(3, false, 'black', squareEval, posMove);
			game.undo();
			if (score > bestEval) {
				bestEval = score;
				bestMove = posMove;
			}
		}

		// const endTime = performance.now();
		// console.log(`MAIN THREAD: minmax took ${(endTime - startTime)/1000} seconds`);

		// const startTime = performance.now();
		// for (let i = 0; i < possibleMoves.length; i++) {
		// 	const posMove = possibleMoves[i];
		// 	game.move(posMove);
		// 	// console.log('posmove', posMove, moveEval(posMove));
		// 	const squareEval = moveEval(posMove);
		// 	const score = minimax(2, false, 'black', squareEval);
		// 	game.undo();
		// 	if (score > bestEval) {
		// 		bestEval = score;
		// 		bestMove = posMove;
		// 	}
		// }

		// const endTime = performance.now();
		// console.log(`Call to minmax took ${(endTime - startTime)/1000} seconds`);

		// console.log('bestMove', bestMove);
		// safeGameMutate((g) => g.move(bestMove));

		// Pick a random score from all best moves
		// const maxScore = Math.max(...scores);
		// const maxScoreIndexes = [];
		// for (let i = 0; i < scores.length; i++) {
		// 	if (scores[i] === maxScore) {
		// 		maxScoreIndexes.push(i);
		// 	}
		// }

		// const randomIndex = Math.floor(Math.random() * maxScoreIndexes.length);
		// console.log('randomindex', randomIndex);
		// const bestMove = possibleMoves[maxScoreIndexes[randomIndex]];
		// safeGameMutate((g) => g.move(bestMove));
	}

    // unthreaded computerMove (testing purposes)
    function unthreadedMove() {
        if (isFirstMove) {
            game.move('d5');
            setIsFirstMove(false);
            return;
        }
        const startTime = performance.now();
        const possibleMoves = game.moves();
        let bestEval = Number.NEGATIVE_INFINITY;
        let bestMove;
        for (let i = 0; i < possibleMoves.length; i++) {
            const posMove = possibleMoves[i];
            game.move(posMove);
            const squareEval = moveEval(posMove);
            const score = minimax(2, false, 'black', squareEval, posMove);
            game.undo();
            if (score > bestEval) {
                bestEval = score;
                bestMove = posMove;
            }
        }
        console.log('bestmove', bestEval, bestMove);
        safeGameMutate((g) => g.move(bestMove));
        const endTime = performance.now();
        console.log(`TOTAL TIME took ${(endTime - startTime)/1000} seconds`);
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

	function onDrop(sourceSquare, targetSquare) {
		const gameCopy = { ...game };
		const move = gameCopy.move({
			from: sourceSquare,
			to: targetSquare,
			promotion: 'q', // always promote to a queen for example simplicity
		});
		setGame(gameCopy);

		// illegal move
		if (move === null) return false;

		// store timeout so it can be cleared on undo/reset so computer doesn't execute move
		const newTimeout = setTimeout(unthreadedMove, 200);
		setCurrentTimeout(newTimeout);
		return true;
	}

	return (
		<div>
			<Chessboard
				id="PlayVsRandom"
				animationDuration={200}
				boardOrientation={boardOrientation}
				boardWidth={boardWidth}
				customArrows={arrows}
				position={game.fen()}
				onPieceDrop={onDrop}
				customBoardStyle={{
					borderRadius: '4px',
					boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
				}}
				ref={chessboardRef}
			/>
            <p>History: {game.history().map(move => move + '\n')}</p>
			<button
				className="rc-button"
				onClick={() => {
					safeGameMutate((game) => {
						game.reset();
					});
					// stop any current timeouts
					clearTimeout(currentTimeout);
				}}
			>
				reset
			</button>
			<button
				className="rc-button"
				onClick={() => {
					setBoardOrientation((currentOrientation) =>
						currentOrientation === 'white' ? 'black' : 'white'
					);
				}}
			>
				flip board
			</button>
			<button
				className="rc-button"
				onClick={() => {
					safeGameMutate((game) => {
						game.undo();
					});
					// stop any current timeouts
					clearTimeout(currentTimeout);
				}}
			>
				undo
			</button>
			<button
				className="rc-button"
				onClick={() => {
					setArrows([
						['a3', 'a5'],
						['g1', 'f3'],
					]);
				}}
			>
				Set Custom Arrows
			</button>
		</div>
	);
}
