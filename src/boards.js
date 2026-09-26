// Isolated-world content script: which board and which pieces (styles/board.css).
// Chess.com's green board and Neo pieces unless the user picks others: the
// user menu's Board and Piece set panels get two tabs, Extension (Chess.com's
// boards and pieces, bundled in img/ by tools/boards/fetch.py) and Lichess
// (Lichess's own panel).
// The pick is kept under `cdc-board` / `cdc-pieces`; `lichess` hands the
// board or the pieces back to Lichess and its pref. Set on <html> from
// document_start, so the board never shows another one first.

(() => {
  const BOARD_KEY = 'cdc-board';
  const PIECES_KEY = 'cdc-pieces';
  const LICHESS = 'lichess';

  // [id, name, light square, dark square, host]: the squares' colors are
  // sampled from each board (for the coordinates drawn inside it). The host
  // is only for tools/boards/fetch.py: the newer boards live on another one
  // of Chess.com's, one of them as a JPEG. Add a board here, then run it.
  const BOARDS = [
    ['green', 'Green', '#ebecd0', '#739552'],
    ['dark_wood', 'Dark Wood', '#c3a370', '#7e5736'],
    ['glass', 'Glass', '#717b8e', '#282e3c'],
    ['brown', 'Brown', '#edd6b0', '#b88762'],
    ['icy_sea', 'Icy Sea', '#d4dfe4', '#7fa1b5'],
    ['newspaper', 'Newspaper', '#cfcdc4', '#a09e98'],
    ['walnut', 'Walnut', '#ba9e79', '#73533a'],
    ['sky', 'Sky', '#f0f1f0', '#c4d8e4'],
    ['lolz', 'Lolz', '#d9e3e4', '#9ba4a3'],
    ['stone', 'Stone', '#b0aca5', '#4e4c4b'],
    ['bases', 'Bases', '#efc99e', '#c56e3a'],
    ['8_bit', '8-Bit', '#f3f3f4', '#6a9b41'],
    ['marble', 'Marble', '#c4bda7', '#716c66'],
    ['purple', 'Purple', '#f0f1f0', '#8476ba'],
    ['translucent', 'Translucent', '#efefef', '#ababab'],
    ['metal', 'Metal', '#d7d7d7', '#767675'],
    ['tournament', 'Tournament', '#e9e9e6', '#32674a'],
    ['dash', 'Dash', '#ba8e52', '#6a3826'],
    ['burled_wood', 'Burled Wood', '#e8c39a', '#744025'],
    ['4fs27', 'Blue', '#f2f6fa', '#5596f2', 'png'],
    ['blue', 'Dark Blue', '#eae9d2', '#4b7399'],
    ['bubblegum', 'Bubblegum', '#fefffe', '#fbd9e1'],
    ['checkers', 'Checkers', '#c64d52', '#333333'],
    ['graffiti', 'Graffiti', '#919191', '#a68866'],
    ['light', 'Light', '#d8d9d8', '#a8a9a8'],
    ['neon', 'Neon', '#c3c5c5', '#655c58'],
    ['orange', 'Orange', '#fae4ae', '#d18815'],
    ['parchment', 'Parchment', '#d5d0b2', '#af955c'],
    ['g715q', 'Pink', '#f5f0f1', '#ec94a4', 'png'],
    ['red', 'Red', '#f5dbc3', '#bb5746'],
    ['sand', 'Sand', '#d3c4b7', '#c0ab97'],
    ['tan', 'Tan', '#edcba5', '#d8a46d'],
    ['6m5lc', 'Sky and Sea', '#90bdcd', '#064b85', 'jpg'],
    ['my2xa', 'Chess the Musical', '#d7d4d4', '#807b76', 'png'],
    ['ohdxn', 'Band Class', '#ebddb7', '#8e8d90', 'png'],
    ['bju81', 'Naroditsky Memorial', '#fbfae9', '#cea861', 'png'],
    ['z4m3d', 'Esports World Cup', '#f7f7f7', '#ccaa6c', 'png'],
  ];

  // [id, name, host], as the boards.
  const PIECE_SETS = [
    ['neo', 'Neo'],
    ['8qetl', 'Neo Angle', 'png'],
    ['game_room', 'Game Room'],
    ['wood', 'Wood'],
    ['glass', 'Glass'],
    ['gothic', 'Gothic'],
    ['classic', 'Classic'],
    ['metal', 'Metal'],
    ['bases', 'Bases'],
    ['neo_wood', 'Neo-Wood'],
    ['icy_sea', 'Icy Sea'],
    ['club', 'Club'],
    ['ocean', 'Ocean'],
    ['newspaper', 'Newspaper'],
    ['space', 'Space'],
    ['cases', 'Cases'],
    ['condal', 'Condal'],
    ['8_bit', '8-Bit'],
    ['marble', 'Marble'],
    ['book', 'Book'],
    ['alpha', 'Alpha'],
    ['bubblegum', 'Bubblegum'],
    ['dash', 'Dash'],
    ['graffiti', 'Graffiti'],
    ['light', 'Light'],
    ['lolz', 'Lolz'],
    ['luca', 'Luca'],
    ['maya', 'Maya'],
    ['modern', 'Modern'],
    ['nature', 'Nature'],
    ['neon', 'Neon'],
    ['sky', 'Sky'],
    ['tigers', 'Tigers'],
    ['tournament', 'Tournament'],
    ['vintage', 'Vintage'],
    ['ca09k', 'Band Class', 'png'],
    ['3d_wood', '3D - Wood'],
    ['3d_staunton', '3D - Staunton'],
    ['3d_plastic', '3D - Plastic'],
    ['3d_chesskid', '3D - ChessKid'],
  ];
  const PIECES = ['wp', 'wn', 'wb', 'wr', 'wq', 'wk', 'bp', 'bn', 'bb', 'br', 'bq', 'bk'];

  // A board is 1200px, its menu tile its two top-left squares; a piece 300px.
  const boardUrl = ([id]) => chrome.runtime.getURL(`img/boards/${id}.webp`);
  const tileUrl = ([id]) => chrome.runtime.getURL(`img/boards/${id}-tile.webp`);
  const pieceUrl = ([id], piece) => chrome.runtime.getURL(`img/pieces/${id}/${piece}.webp`);

  const root = document.documentElement;
  // The page world can't ask where the extension's files are (review.js
  // draws Neo pieces in the coach's comments).
  root.dataset.cdcAssets = chrome.runtime.getURL('');
  const stored = (key, list) => {
    const v = localStorage.getItem(key);
    return v === LICHESS || list.some(([id]) => id === v) ? v : list[0][0];
  };
  let board = stored(BOARD_KEY, BOARDS);
  let pieces = stored(PIECES_KEY, PIECE_SETS);

  // The default green board is board.css's own drawing, crisper than an
  // image, and the Neo pieces are its fallbacks: only the others set anything.
  const applyBoard = () => {
    root.dataset.cdcBoard = board;
    const b = BOARDS.find(([id]) => id === board);
    for (const p of ['--cdc-board-img', '--cdc-sq-light', '--cdc-sq-dark']) root.style.removeProperty(p);
    if (!b || b === BOARDS[0]) return;
    root.style.setProperty('--cdc-board-img', `url('${boardUrl(b)}')`);
    root.style.setProperty('--cdc-sq-light', b[2]);
    root.style.setProperty('--cdc-sq-dark', b[3]);
  };
  const applyPieces = () => {
    root.dataset.cdcPieces = pieces;
    const set = PIECE_SETS.find(([id]) => id === pieces);
    for (const p of PIECES) {
      if (!set || set === PIECE_SETS[0]) root.style.removeProperty(`--cdc-piece-${p}`);
      else root.style.setProperty(`--cdc-piece-${p}`, `url('${pieceUrl(set, p)}')`);
    }
  };
  applyBoard();
  applyPieces();

  const KINDS = {
    board: {
      key: BOARD_KEY,
      list: BOARDS,
      get: () => board,
      set: v => {
        board = v;
        applyBoard();
      },
      thumb: tileUrl,
    },
    piece: {
      key: PIECES_KEY,
      list: PIECE_SETS,
      get: () => pieces,
      set: v => {
        pieces = v;
        applyPieces();
      },
      thumb: set => pieceUrl(set, 'wn'),
    },
  };

  const pick = (kind, v) => {
    const k = KINDS[kind];
    k.set(v);
    localStorage.setItem(k.key, v);
    for (const panel of document.querySelectorAll(`#dasher_app .sub.${kind}`)) mark(panel, kind);
  };

  // The current pick is ringed in its own tab only: with the extension's
  // board on, Lichess's current one isn't what the board shows.
  const mark = (panel, kind) => {
    const v = KINDS[kind].get();
    panel.dataset.cdcSrcOn = v === LICHESS ? LICHESS : 'cdc';
    for (const item of panel.querySelectorAll('.cdc-src-item')) item.classList.toggle('active', item.dataset.id === v);
  };

  const show = (panel, view) => {
    panel.dataset.cdcView = view;
    for (const tab of panel.querySelectorAll('.cdc-src-tabs button'))
      tab.classList.toggle('active', tab.dataset.view === view);
  };

  const button = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    if (text) b.textContent = text;
    return b;
  };

  // Both tabs after the panel's title, the extension's choices after them.
  // Snabbdom leaves nodes it didn't make where they are. Only in 2D: the
  // extension's boards and pieces are flat, so in 3D the panel is Lichess's.
  const views = {};
  const dress = (panel, kind) => {
    const k = KINDS[kind];
    const tabs = document.createElement('div');
    tabs.className = 'cdc-src-tabs';
    for (const [view, label] of [['cdc', 'Extension'], [LICHESS, 'Lichess']]) {
      const tab = button('', label);
      tab.dataset.view = view;
      tab.addEventListener('click', () => {
        views[kind] = view;
        show(panel, view);
      });
      tabs.append(tab);
    }
    const list = document.createElement('div');
    list.className = 'cdc-src-list';
    for (const entry of k.list) {
      const [id, name] = entry;
      const item = button('cdc-src-item');
      item.dataset.id = id;
      const thumb = document.createElement('span');
      thumb.className = 'cdc-src-thumb';
      thumb.style.backgroundImage = `url('${k.thumb(entry)}')`;
      const label = document.createElement('span');
      label.className = 'cdc-src-name';
      label.textContent = name;
      item.append(thumb, label);
      item.addEventListener('click', () => pick(kind, id));
      list.append(item);
    }
    panel.querySelector(':scope > .head')?.after(tabs, list);
    mark(panel, kind);
    show(panel, views[kind]);
  };

  // A panel opens on the tab of what's on the board. Snabbdom draws a new one
  // when 3D is switched to 2D (its class changes): that one keeps the tab.
  const open = {};
  const syncPanels = () => {
    const app = document.getElementById('dasher_app');
    for (const kind of Object.keys(KINDS)) {
      const panel = app?.querySelector(`.sub.${kind}`);
      if (!panel) {
        open[kind] = false;
        continue;
      }
      if (!open[kind]) views[kind] = KINDS[kind].get() === LICHESS ? LICHESS : 'cdc';
      open[kind] = true;
      if (panel.matches('.d2') && !panel.querySelector(':scope > .cdc-src-tabs')) dress(panel, kind);
    }
  };

  // A board or a piece set picked in Lichess's own list (not its 2D / 3D
  // switch or its sliders) hands that back to it.
  document.addEventListener('click', e => {
    for (const kind of Object.keys(KINDS))
      if (e.target.closest?.(`#dasher_app .sub.${kind}.d2 .list > button`) && KINDS[kind].get() !== LICHESS)
        pick(kind, LICHESS);
  });

  // The menu is drawn when first opened, then redrawn on every click in it:
  // watched, not polled, so a panel never shows without its tabs first.
  const watch = () => {
    const app = document.getElementById('dasher_app');
    if (!app) return;
    new MutationObserver(syncPanels).observe(app.parentElement, { childList: true, subtree: true });
    syncPanels();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})();
