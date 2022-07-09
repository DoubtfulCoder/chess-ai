import { Chess } from 'chess.js';
import { useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { moveEval, sortMoves } from './PositionEval';

// console.log('Qd6', moveEval('Qd6', 'black'));
console.log('Number of threads on your device: ', navigator.hardwareConcurrency);
// check if get is working
// console.log('c1', game.get(114));

// Gets number of threads on your device
const NUM_THREADS = navigator.hardwareConcurrency - 1;

// Position constants
const QUEENS_RAID = 'rnb1k1nr/pppp1ppp/5q2/2b1p3/4P1Q1/2N5/PPPP1PPP/R1B1KBNR w KQkq - 4 4';
const MATE_IN_ONE = 'k7/4Q3/5R2/p7/4P3/2N5/PPPPBPPP/R1B1K1N1 w Q - 0 1';
const TRICKY_POSITION = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/4P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const ENDGAME_POSITION = '6k1/p3n1p1/1p3rp1/2p1p3/P1Pp1P2/1P1P4/3KPR2/6R1 w - - 0 34';
const ENDGAME_POSITION_2 = '1r6/1P1kn3/3bppp1/7p/5N1P/6P1/3B1P2/1R4K1 w - - 0 1';
const FREE_PAWN_POSITION = '1b6/1Pk5/8/8/8/5K2/6P1/8 w - - 0 1';
const PREVENT_PROMOTION_POSITION = '8/bPk5/5KP1/8/8/8/8/8 w - - 1 20';

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
export function isQuietMove(game, move) {
	// check if there is a piece on new square (capture)
    return game.get(move.to) === null;
}

/* counts number of pieces on board given FEN */
function countNumberOfPiecesOnBoard(fen) {
	fen = fen.split(' ')[0]; // just the position
	fen = fen.replace(/[0-9/]/g, ''); // removes all numbers and slashes
	return fen.length;
}

export default function DebugApp({ boardWidth }) {
	const chessboardRef = useRef();
	const [game, setGame] = useState(new Chess());
	const [engineDepth, setEngineDepth] = useState(4);
	const [quiescenceDepth, setQuiescenceDepth] = useState(4);
    const [isFirstMove, setIsFirstMove] = useState(true);
	const [arrows, setArrows] = useState([]);
	const [boardOrientation, setBoardOrientation] = useState('white');
	const [currentTimeout, setCurrentTimeout] = useState(undefined);
	const [numPiecesOnBoard, setNumPiecesOnBoard] = useState(
		countNumberOfPiecesOnBoard(game.fen())
	);

	let nodes = 0;
	let sortingTime = 0;
	let quiescenceTime = 0;
	let moveGenerationTime = 0;
	let positionEvalTime = 0;
    let gameMoveTime = 0;
    let gameUndoTime = 0;

	function safeGameMutate(modify) {
		setGame((g) => {
			const update = { ...g };
			modify(update);
			return update;
		});
	}

	// minimax search with alpha-beta pruning
	function minimax(
		depth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
		alpha = Number.NEGATIVE_INFINITY, beta = Number.POSITIVE_INFINITY
	) {
		nodes++;
		// Base case: evaluate board
		if (depth === 0) {
            // check for quiet moves (non-captures)
            if (isQuietMove(mostRecentMove)) {
			    return positionEval(playerColor) + moveEval;
            } else {
				// const startTime = performance.now();
                const quiescence = quiescenceSearch(
                    quiescenceDepth, isMaximizingPlayer, playerColor, moveEval, mostRecentMove,
                    alpha, beta
                );
				// const endTime = performance.now();
				// quiescenceTime += endTime - startTime;
				return quiescence;
            }
		}

		// Recursive case: search possible moves
		const startTime = performance.now();
		let possibleMoves = game.moves();
		const endTime = performance.now();
		moveGenerationTime += endTime - startTime;
		// Sort moves to put captures first
		// console.log('presort', possibleMoves);
		const startSortTime = performance.now();
		possibleMoves = sortMoves(game, possibleMoves);
		const endSortTime = performance.now();
		sortingTime += (endSortTime - startSortTime);
		// console.log('postsort', possibleMoves);
        let bestMoveValue = isMaximizingPlayer
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY;

		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
            const startGameMoveTime = performance.now();
			const move = possibleMoves[i];
			// Make the move, but undo before exiting loop
			game.move(move);
            const endGameMoveTime = performance.now();
            gameMoveTime += endGameMoveTime - startGameMoveTime;
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
            const startGameUndoTime = performance.now();
			game.undo();
            const endGameUndoTime = performance.now();
            gameUndoTime += endGameUndoTime - startGameUndoTime;
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
		nodes++;

		// evaluate position
		const evaluation = positionEval(playerColor) + moveEval;
		// fail-hard beta cutoff (piece cut off so it prevents things like promotions)
		if (evaluation >= beta && numPiecesOnBoard >= 8) 
		{
			// node (move) fails high
			return beta;
		}

        // console.log('Quiescence search', mostRecentMove);
		// Base case: evaluate board
		if (isQuietMove(mostRecentMove) || depth === 0) {
            // console.log('Quiescence search', mostRecentMove);
			return evaluation;
		}

		// Recursive case: search possible moves
		const startTime = performance.now();
		let possibleMoves = game.moves();
		const endTime = performance.now();
		moveGenerationTime += endTime - startTime;
		// console.log('presort', possibleMoves);
		// const startTime = performance.now();
		const startSortTime = performance.now();
		possibleMoves = sortMoves(game, possibleMoves);
		const endSortTime = performance.now();
		sortingTime += endSortTime - startSortTime;
		// const endTime = performance.now();
		// sortingTime += endTime - startTime;
		// console.log('postsort', possibleMoves);
        let bestMoveValue = isMaximizingPlayer
					? Number.NEGATIVE_INFINITY
					: Number.POSITIVE_INFINITY;

		// Search through all possible moves
		for (let i = 0; i < possibleMoves.length; i++) {
			const startGameMoveTime = performance.now();
			const move = possibleMoves[i];
			// Make the move, but undo before exiting loop
			game.move(move);
			const endGameMoveTime = performance.now();
			gameMoveTime += endGameMoveTime - startGameMoveTime;
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
            const startGameUndoTime = performance.now();
			game.undo();
            const endGameUndoTime = performance.now();
            gameUndoTime += endGameUndoTime - startGameUndoTime;
			// Check for alpha beta pruning
			if (beta <= alpha) {
				// console.log('Prune', alpha, beta);
				break;
			}
		}

        return bestMoveValue;
	}

	function computerMove() {
        // if (isFirstMove) {
        //     game.move('d5');
        //     setIsFirstMove(false);
        //     return;
        // }

		// TODO : change moveEval if threading is brought back

        const startTime = performance.now();

		let possibleMoves = game.moves();
		possibleMoves = sortMoves(game, possibleMoves);

		let bestEval = Number.NEGATIVE_INFINITY;
		let bestMove;

		// Evaluate first 3 moves (highest values in MVV-LVA) 
		// on main thread for alpha values for worker threads
		const startTime2 = performance.now();
		for (let i = 0; i < 3; i++) {
			const posMove = possibleMoves[i];
			game.move(posMove);
			const squareEval = moveEval(posMove);
			const score = minimax(engineDepth, false, 'black', squareEval, posMove, bestEval);
			game.undo();
			if (score > bestEval) {
				bestEval = score;
				bestMove = posMove;
			}
		}
		const endTime2 = performance.now();
		console.log('first 3 took: ', (endTime2 - startTime2));

		// remove first 3 moves from possible moves
		possibleMoves = possibleMoves.slice(3);

		const workers = [];
		// Most moves evaluated on 3 threads with remainder on main thread
		const workerChunk = Math.floor(possibleMoves.length / NUM_THREADS);
		const mainThreadStart = workerChunk * NUM_THREADS;
		let numWorkersDone = 0;

		for (let i = 0; i < NUM_THREADS; i++) {
			workers[i] = new Worker(new URL('./worker.js', import.meta.url));
			workers[i].postMessage({
				depth: engineDepth,
				quiescenceDepth: quiescenceDepth,
				posMoves: possibleMoves.slice(i * workerChunk, (i + 1) * workerChunk),
				gameFEN: game.fen(),
				alpha: bestEval,
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
				if (numWorkersDone === NUM_THREADS) {
					console.log('bestmove', bestEval, bestMove);
					safeGameMutate((g) => g.move(bestMove));
                    
                    // log total time taken
                    const endTime = performance.now();
		            console.log(`TOTAL TIME took ${(endTime - startTime)/1000} seconds`);
					console.log('nodes checked', nodes);
					nodes = 0;
				}
			};
		}

		// Finish last few moves on main thread
		for (let i = mainThreadStart; i < possibleMoves.length; i++) {
			const posMove = possibleMoves[i];
			game.move(posMove);
			const squareEval = moveEval(posMove);
			const score = minimax(engineDepth, false, 'black', squareEval, posMove, bestEval);
			game.undo();
			if (score > bestEval) {
				bestEval = score;
				bestMove = posMove;
			}
		}

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
        // if (isFirstMove) {
        //     game.move('d5');
        //     setIsFirstMove(false);
        //     return;
        // }
		
        const startTime = performance.now();
		let possibleMoves = game.moves();
		const endTime2 = performance.now();
		moveGenerationTime += endTime2 - startTime;
		possibleMoves = sortMoves(game, possibleMoves);
        let bestEval = Number.NEGATIVE_INFINITY;
        let bestMove;

		// do minimax on each move
        for (let i = 0; i < possibleMoves.length; i++) {
            const posMove = possibleMoves[i];
            game.move(posMove);
            const squareEval = moveEval(posMove, 'black', numPiecesOnBoard);
			// console.log('squareeval', posMove, squareEval);
            const score = minimax(engineDepth-1, false, 'black', squareEval, posMove, bestEval);
            game.undo();
            if (score > bestEval) {
                bestEval = score;
                bestMove = posMove;
            }
        }

		// bestMove is undefined if checkmate in one for opponent
		if (bestMove === undefined && possibleMoves.length !== 0) {
			bestMove = possibleMoves[0];
		}

        console.log('bestmove', bestEval, bestMove);		
        safeGameMutate((g) => g.move(bestMove));
		// update number of pieces on board
		setNumPiecesOnBoard(countNumberOfPiecesOnBoard(game.fen()));

        const endTime = performance.now();
        console.log(`TOTAL TIME took ${(endTime - startTime)/1000} seconds`);
		console.log(`total sorting time took ${sortingTime/1000} seconds`);
		// console.log(`TOTAL QUIESCENCE TIME took ${quiescenceTime / 1000} seconds`);
		console.log(`total move generation time took ${moveGenerationTime / 1000} seconds`);
		console.log(`total position eval time took ${positionEvalTime / 1000} seconds`);
        console.log(`total game move time took ${gameMoveTime / 1000} seconds`);
        console.log(`total game undo time took ${gameUndoTime / 1000} seconds`);
        console.log(
					`move gen + game move + game undo time took ${
						(moveGenerationTime + gameMoveTime + gameUndoTime) / 1000
					} seconds`
				);
		console.log('nodes checked', nodes);
		nodes = 0;
		sortingTime = 0;
		quiescenceTime = 0;
		moveGenerationTime = 0;
		positionEvalTime = 0;
        gameMoveTime = 0;
        gameUndoTime = 0;
    }

	// checks time consumption for ugly vs. pretty move generation
	function uglyVsPrettyMove() {
		const numIters = 30;

		// ugly version
		const startTest1 = performance.now();
		for (let i = 0; i < numIters; i++) {
			const ugly_moves = game.moves_ugly();
			console.log('ugly', ugly_moves);
			// console.log('ugly moves: ', ugly_moves);
			// safeGameMutate((g) => g.move(ugly_moves[0], { bypass: true }));
			game.move(ugly_moves[0], { bypass: true });
		}
		const endTest1 = performance.now();
		console.log('time: ', endTest1 - startTest1);

		const startUndoTime1 = performance.now();
		for (let i = 0; i < numIters; i++) {
			game.undo();
		}
		const endUndoTime2 = performance.now();
		console.log('undo time: ', endUndoTime2 - startUndoTime1);

		// pretty version
		const startTest2 = performance.now();
		for (let i = 0; i < numIters; i++) {
			const nice_moves = game.moves();
			// console.log('nice moves: ', nice_moves);
			// safeGameMutate((g) => g.move(nice_moves[0]));
			game.move(nice_moves[0]);
		}
		const endTest2 = performance.now();
		console.log('time: ', endTest2 - startTest2);

		return;
	}

	function positionEval(playerColor) {
		const startTime = performance.now();


		let position = game.fen().split(' ')[0];
		let score = 0;

		Object.keys(pieceValues).forEach((key) => {
			score += countOccurences(position, key.toUpperCase()) * pieceValues[key]; // white pieces
			score -= countOccurences(position, key) * pieceValues[key]; // black pieces
		});

		const endTime = performance.now();
		positionEvalTime += endTime - startTime;

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
		setNumPiecesOnBoard(countNumberOfPiecesOnBoard(gameCopy.fen()));

		// hike up the depth in endgame
		if (numPiecesOnBoard <= 8 && engineDepth < 5) {
			console.log('hiked!');
			setEngineDepth(engineDepth + 1);
		}
		// hike it up even more
		if (numPiecesOnBoard <= 5 && engineDepth < 6) {
			console.log('more!');
			setEngineDepth(engineDepth + 1);
		}

		// illegal move
		if (move === null) return false;

		// store timeout so it can be cleared on undo/reset so computer doesn't execute move
		const newTimeout = setTimeout(uglyVsPrettyMove, 300);
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
			<p>History: {game.history().map((move) => move + '\n')}</p>
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

			{/* Select Depth */}
			<label htmlFor="depth">Depth: </label>
			<select
				name="depth"
				id="depth"
				onChange={(e) => setEngineDepth(Number(e.target.value))}
				defaultValue="4"
			>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5</option>
				<option value="6">6</option>
			</select>

			{/* Select quiescence depth */}
			<label htmlFor="quiescence">Quiescence depth: </label>
			<select
				name="quiescence"
				id="depth"
				onChange={(e) => setQuiescenceDepth(Number(e.target.value))}
				defaultValue="4"
			>
				<option value="2">2</option>
				<option value="3">3</option>
				<option value="4">4</option>
				<option value="5">5</option>
			</select>
		</div>
	);
}
