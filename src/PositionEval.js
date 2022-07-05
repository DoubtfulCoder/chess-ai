// Best squares for different pieces to be on (black's perspective) 
export const bestSquares = {
	// pawns usually better in center
	// prettier-ignore
	'p': [
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.3, 0.3, 0.2, 0.3, 0.3, 0.1, 0.3, 0.3],
		[0.2, 0.1, 0.4, 0.5, 0.5, 0.1, 0.1, 0.1],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// knights better towards center not edges
	// prettier-ignore
	'n': [
		[0.0,-0.1, 0.0, 0.0, 0.0, 0.0,-0.1, 0.0],
		[0.0, 0.0, 0.0, 0.2, 0.2, 0.0, 0.0, 0.0],
		[-0.1,0.0, 0.4, 0.0, 0.0, 0.4, 0.0, -0.1],
		[0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
		[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
	],
	// prettier-ignore
	'b': [
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
};

// strip off any move decorations: e.g Nf3+?! becomes Nf3
function stripped_san(move) {
  return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '')
}

// gets move in SAN (e.g. Nc4) and gets corresponding eval from bestSquares
export function moveEval(move, color='black') {
    // castling is +0.7
    if (move.includes('O-O')) { return 0.7; }
    // promotion is +9
    if (move.includes('=')) { return 9; }
    // discourage checks TODO : make this only for first 15 moves
    if (move.includes('+')) { return -0.5; }

    move = stripped_san(move); // remove decorations like +!?# at end
	// piece code is always first char for non-pawns
	let piece = move[0];
    if (piece === 'K') { // nothing for king in bestSquares yet
        return 0;
    } else if (piece !== 'B' && piece !== 'N' && piece !== 'R' && piece !== 'Q') {
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
	return bestSquares[piece][file][rank];
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