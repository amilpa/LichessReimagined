// Lichess's page paths the page world tells apart.

/** A game's page: its id, then the side it's seen from, if given (`/abcd1234/black`). */
export const GAME_PAGE = /^\/[a-zA-Z0-9]{8}(?:[a-zA-Z0-9]{4})?(?:\/(?:white|black))?\/?$/;
