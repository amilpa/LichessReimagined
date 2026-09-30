// Which DOM changes can move our shapes. The observer watches the whole
// document for the board to appear, but a game changes far more than the
// board (clocks, chat, the move list): those mustn't cost a draw each.

const BOARD = '.main-board';

// A board drawn anew, or the page around it.
const bringsBoard = (node: Node): boolean =>
  node instanceof Element && (node.matches(BOARD) || node.querySelector(BOARD) !== null);

/**
 * Chessground redrawing its svg or the board, a board appearing, the board
 * turning round (the wrap's class), or the Game Review switching mode (on
 * <html>). The review's arrows have their own listener.
 */
export function mayChangeShapes(record: MutationRecord): boolean {
  const { target } = record;
  if (record.type !== 'childList') {
    return (
      target === document.documentElement ||
      (target instanceof Element && target.classList.contains('cg-wrap'))
    );
  }
  if (target instanceof Element && target.closest(BOARD) !== null) return true;
  return [...record.addedNodes].some(bringsBoard);
}
