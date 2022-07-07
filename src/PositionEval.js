import { isQuietMove, pieceValues } from "./App";

// Access using MVV_LVA[Victim][Attacker]
const MVV_LVA = {
	p: { p: 105, n: 104, b: 103, r: 102, q: 101, k: 100 },
	n: { p: 205, n: 204, b: 203, r: 202, q: 201, k: 200 },
	b: { p: 305, n: 304, b: 303, r: 302, q: 301, k: 300 },
	r: { p: 405, n: 404, b: 403, r: 402, q: 401, k: 400 },
	q: { p: 505, n: 504, b: 503, r: 502, q: 501, k: 500 },
	k: { p: 605, n: 604, b: 603, r: 602, q: 601, k: 600 },
};

// Best squares for different pieces to be on (black's perspective) 
const bestSquares = {
	// pawns usually better in center
	// prettier-ignore
	p: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.3, 0.2, 0.2, 0.3, 0.3, 0.1, 0.3, 0.3],
		[0.2, 0.1, 0.4, 0.5, 0.5, 0.1, 0.1, 0.1],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// knights better towards center not edges
	// prettier-ignore
	n: [
		[0.0,-0.1, 0.0, 0.0, 0.0, 0.0,-0.1, 0.0],
		[0.0, 0.0, 0.0, 0.2, 0.2, 0.0, 0.0, 0.0],
		[-0.1,0.2, 0.4, 0.0, 0.0, 0.4, 0.2,-0.1],
		[0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// prettier-ignore
	b: [
		[0.0, 0.0,-0.1, 0.0, 0.0,-0.1, 0.0, 0.0],
		[0.0, 0.3, 0.0, 0.1, 0.1, 0.0, 0.3, 0.0],
		[0.0, 0.0, 0.0, 0.2, 0.2, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.3, 0.0, 0.0, 0.3, 0.0, 0.0],
		[0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	r: [
		[0.0, 0.0, 0.2, 0.3, 0.3, 0.2, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	q: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	k: [
		[0.0, 0.0, 0.0,-0.5, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0,-0.5,-0.5, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	]
};

// Best squares for endgame (start pushing pawns, rooks, king)
const endgameSquares = {
	// pawns usually better in center
	// prettier-ignore
	p: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
		[0.3, 0.3, 0.3, 0.5, 0.5, 0.3, 0.3, 0.3],
		[0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
		[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
		[0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// knights better towards center not edges
	// prettier-ignore
	n: [
		[0.0,-0.1, 0.0, 0.0, 0.0, 0.0,-0.1, 0.0],
		[0.0, 0.0, 0.0, 0.1, 0.1, 0.0, 0.0, 0.0],
		[-0.1,0.1, 0.1, 0.0, 0.0, 0.1, 0.1,-0.1],
		[0.0, 0.0, 0.0, 0.1, 0.1, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// prettier-ignore
	b: [
		[0.0, 0.0,-0.1, 0.0, 0.0,-0.1, 0.0, 0.0],
		[0.0, 0.1, 0.0, 0.1, 0.1, 0.0, 0.1, 0.0],
		[0.0, 0.0, 0.0, 0.1, 0.1, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.1, 0.0, 0.0, 0.1, 0.0, 0.0],
		[0.0, 0.1, 0.0, 0.0, 0.0, 0.0, 0.1, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	r: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	q: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// prettier-ignore
	k: [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.2, 0.2, 0.2, 0.0, 0.0],
		[0.0, 0.2, 0.2, 0.2, 0.2, 0.0, 0.0, 0.0],
		[0.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.0, 0.0],
		[0.0, 0.0, 0.2, 0.2, 0.2, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
};

// strip off any move decorations: e.g Nf3+?! becomes Nf3
function stripped_san(move) {
	//   return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '')
	return move.replace(/[+#]?[?!]*$/, '');
}

// gets move in SAN (e.g. Nc4) and gets corresponding eval from bestSquares/endgameSquares
export function moveEval(move, color='black', numPiecesOnBoard) {
	let moveValue = 0;
    // castling is +0.7
    if (move.includes('O-O')) { return 0.7; }
    // promotion is +9
    if (move.includes('=')) { return 9; }
    // discourage checks in beginning(?)
    if (move.includes('+') && numPiecesOnBoard > 20) { moveValue = -0.3; }
	// encourage captures slightly
	if (move.includes('x')) { moveValue = 0.3; }

    move = stripped_san(move); // remove decorations like +!?# at end
	// piece code is always first char for non-pawns
	let piece = move[0];
	// pawn moves are like 'd4' or 'bxc4' without 'P' char
	if (piece !== 'B' && piece !== 'N' && piece !== 'R' && piece !== 'Q' && piece !== 'K') {
        piece = 'p';
    }
    piece = piece.toLowerCase();
	const square = move.slice(move.length - 2, move.length); // square is always last two chars

	// convert characters to numbers
    let rank;
    let file;
    if (color === 'white') {
        rank = square.charCodeAt(0) - 97;
        file = square.charCodeAt(1) - 49;
    } else {
        rank = square.charCodeAt(0) - 97;
        file = 7 - (square.charCodeAt(1) - 49);
    }

	// check for endgame (<= 15 pieces)
	if (numPiecesOnBoard <= 15) {
		console.log('endgame!');
		return endgameSquares[piece][rank][file] + moveValue;
	} 
	
	return bestSquares[piece][file][rank] + moveValue;
}

/* Gets the value of a capture using MVV-LVA table */
export function getCaptureValue(game, move) {
	move = stripped_san(move); // remove decorations like +!?# at end
	let value = 0;
	// check for promotion
	if (move.includes('=')) {
		// add promoted piece's value
		value += pieceValues[move[move.length - 1].toLowerCase()];
		move = move.slice(0, move.length - 2); // remove promotion piece
	}

	// piece code is always first char for non-pawns
	let attacker = move[0];
	if (attacker !== 'B' && attacker !== 'N' && attacker !== 'R' && attacker !== 'Q' && attacker !== 'K') {
        attacker = 'p';
    }
    attacker = attacker.toLowerCase();
	
	// last two chars are victim square
	// TOOD : check en pessant
	const victimSquare = move.slice(move.length - 2, move.length);
	const victim = game.get(victimSquare).type.toLowerCase();

	value += MVV_LVA[victim][attacker]
	return value;
}

/* Get value of move (captures given higher value) */
export function getMoveValue(game, move) {
	if (isQuietMove(move)) {
		return 0;
	} else {
		try {
			return getCaptureValue(game, move);
		} catch(e) { // doesn't work on en pessant yet
			// console.error(e);
			// console.log(move);
			return 0;
		}
		
	}
}

function getMoveValueTEST(game, move) {
	return 0;
}

/* Sorts moves in descending order by capture value */
export function sortMoves(game, moves) {
	// return moves.sort((a, b) => {
	// 	return getMoveValue(game, b) - getMoveValue(game, a);
	// });

    let moveScores = [];
    
    // score all moves 
    for (let i = 0; i < moves.length; i++) {
        moveScores[i] = getMoveValue(game, moves[i]);
	}
    
    // loop over current move within a move list
    for (let current_move = 0; current_move < moves.length; current_move++)
    {
        // loop over next move within a move list
        for (let next_move = current_move + 1; next_move < moves.length; next_move++)
        {
            // compare current and next move scores
            if (moveScores[current_move] < moveScores[next_move])
            {
                // swap scores
                let temp_score = moveScores[current_move];
                moveScores[current_move] = moveScores[next_move];
                moveScores[next_move] = temp_score;
                
                // swap moves
                let temp_move = moves[current_move];
                moves[current_move] = moves[next_move];
                moves[next_move] = temp_move;
            }
        }
    }

	// console.log('moveScores', moveScores);

	return moves;
}

// TODO : code below may help with from square 
// function getEval(move) {
//     const san = move.san;
//     const piece = san[0];
//     const from = san.slice(1, 3);
//     const to = san.slice(3, 5);
//     const fromSquare = chess.square(from);
//     const toSquare = chess.square(to);
//     const pieceEval = bestSquares[piece][toSquare];
//     return pieceEval;
// }