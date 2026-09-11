import { GRID_SIZE, MARGIN, DRAG_INDEX, STATIC_INDEX, DEFAULT_MEMO } from "./globals";
import { snapToGrid, confirm, generateUUID, getLocalStorageItem, setLocalStorageItem, decreaseAllMemoIndexes, checkBounds } from "./utils";

import "../sass/index.scss";

let theme = "light";
let activeMemo;

let main, canvas, board, selection;
let currentMouse, currentRect, activeResizeDirection;
let tabs = [];
let activeTabId = null;
let tabsContainer, tabsList;
let dragGhostImage = null;
let dropOverlay = null;
let dragCounter = 0;

function getCurrentTabMemos() {
  if (!activeTabId) { return {}; }
  return getLocalStorageItem(`manifest_memos_${activeTabId}`) || {};
};

function saveCurrentTabMemos(memos) {
  if (!activeTabId) { return; }
  setLocalStorageItem(`manifest_memos_${activeTabId}`, memos);
  setLocalStorageItem("manifest_memos", memos);
};

/*
  Generic Event Handlers
*/

function onMouseDown(e) {
  if (e.target === board) {
    handleBoardDragStart(e);
  } else {
    if (e.target.classList.contains("drag")) {
      handleMemoDragStart(e);
    } else if (e.target.classList.contains("resize")) {
      handleMemoResizeStart(e);
    }
  }
};

/*
  Memo Functions and Handlers
*/

function createMemo(id, text, position, size) {
  const memo = document.createElement("div");
  memo.setAttribute("data-id", id);
  memo.classList.add("memo");
  memo.style.top = `${position.top}px`;
  memo.style.left = `${position.left}px`;
  memo.style.width = `${size.width}px`;
  memo.style.height = `${size.height}px`;
  memo.style.zIndex = STATIC_INDEX;

  const textarea = document.createElement("textarea");
  textarea.classList.add("input");
  textarea.setAttribute("placeholder", "Add a short memo...");
  textarea.setAttribute("autocomplete", true);

  if (text) { textarea.value = text; }

  textarea.addEventListener("focus", function (e) {
    e.target.classList.add("active");

    decreaseAllMemoIndexes();

    activeMemo = e.target.parentNode;
    activeMemo.style.zIndex = STATIC_INDEX;
  });
  textarea.addEventListener("blur", function (e) { e.target.classList.remove("active"); }, { passive: false, useCapture: false });
  textarea.addEventListener("input", function (e) {
    const memos = getCurrentTabMemos();
    memos[id] = { ...memos[id], text: e.target.value };
    saveCurrentTabMemos(memos);
  }, { passive: false, useCapture: false });

  memo.appendChild(textarea);

  const drag = document.createElement("div");
  drag.classList.add("drag");
  drag.addEventListener("mousedown", onMouseDown);
  drag.addEventListener("touchstart", onMouseDown);
  memo.appendChild(drag);

  const close = document.createElement("div");
  close.classList.add("close");
  close.innerHTML = "–";
  close.addEventListener("mouseup", handleMemoClose);
  close.addEventListener("touchend", handleMemoClose);
  memo.appendChild(close);

  const resizeDirections = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  resizeDirections.forEach(function (dir) {
    const resize = document.createElement("div");
    resize.classList.add("resize", `resize-${dir}`);
    resize.setAttribute("data-direction", dir);
    resize.addEventListener("mousedown", onMouseDown);
    resize.addEventListener("touchstart", onMouseDown);
    memo.appendChild(resize);
  });

  return memo;
};

function handleMemoDragStart(e) {
  if (e.which === 1 || e.touches) {
    decreaseAllMemoIndexes();

    activeMemo = e.target.parentNode;
    activeMemo.classList.add("active");
    activeMemo.style.zIndex = STATIC_INDEX;

    const textarea = activeMemo.querySelectorAll(".input")[0];
    textarea.blur();

    e.target.style.backgroundColor = "var(--gray)";
    e.target.style.cursor = "grabbing";

    document.body.style.cursor = "grabbing";

    const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
    const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

    currentMouse = { x, y };

    document.addEventListener("mousemove", handleMemoDragMove, { passive: false, useCapture: false });
    document.addEventListener("touchmove", handleMemoDragMove, { passive: false, useCapture: false });

    document.addEventListener("mouseup", handleMemoDragEnd, { passive: false, useCapture: false });
    document.addEventListener("touchcancel", handleMemoDragEnd, { passive: false, useCapture: false });
    document.addEventListener("touchend", handleMemoDragEnd, { passive: false, useCapture: false });
  }
};

function handleMemoDragMove(e) {
  const isActive = activeMemo.classList.contains("active");

  if (isActive) {
    const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
    const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

    activeMemo.style.top = `${activeMemo.offsetTop - (currentMouse.y - y)}px`;
    activeMemo.style.left = `${activeMemo.offsetLeft - (currentMouse.x - x)}px`;

    currentMouse = { x, y };
  }
};

function handleMemoDragEnd(e) {
  const bounds = checkBounds(board.getBoundingClientRect(), activeMemo.getBoundingClientRect());

  const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
  const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

  let top = activeMemo.offsetTop - (currentMouse.y - y);
  let left = activeMemo.offsetLeft - (currentMouse.x - x);

  if (bounds) {
    if (bounds.edge === "top") {
      top = bounds.offset;
    } else if (bounds.edge === "bottom") {
      top = bounds.offset;
    } else if (bounds.edge === "left") {
      left = bounds.offset;
    } else if (bounds.edge === "right") {
      left = bounds.offset;
    }
  }

  activeMemo.style.top = `${top}px`;
  activeMemo.style.left = `${left}px`;
  activeMemo.classList.remove("active");

  const drag = activeMemo.querySelectorAll(".drag")[0];
  drag.style.cursor = "grab";
  drag.style.backgroundColor = "transparent";

  const textarea = activeMemo.querySelectorAll(".input")[0];
  textarea.focus();

  const id = activeMemo.dataset.id;
  const memos = getCurrentTabMemos();
  memos[id] = { ...memos[id], position: { top, left } };
  saveCurrentTabMemos(memos);

  document.body.style.cursor = null;
  activeMemo = null;
  currentMouse = null;

  document.removeEventListener("mousemove", handleMemoDragMove);
  document.removeEventListener("touchmove", handleMemoDragMove);

  document.removeEventListener("mouseup", handleMemoDragEnd);
  document.removeEventListener("touchcancel", handleMemoDragEnd);
  document.removeEventListener("touchend", handleMemoDragEnd);
};

function handleMemoClose(e) {
  const memoEl = e.target.parentNode;
  const id = memoEl.dataset.id;
  confirm("Are you sure you want to remove this memo?").then(function (ok) {
    if (ok) {
      const memos = getCurrentTabMemos();
      delete memos[id];
      saveCurrentTabMemos(memos);

      if (memoEl.parentNode) {
        board.removeChild(memoEl);
      }
    }
  });
};

const RESIZE_CURSORS = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize"
};

function calculateMemoResize(direction, rect, dx, dy, boardWidth, boardHeight) {
  let { top, left, width, height } = rect;

  if (direction.includes("e")) {
    width = Math.max(80, rect.width + dx);
    if (boardWidth && (left + width > boardWidth)) {
      width = Math.max(80, boardWidth - left);
    }
  } else if (direction.includes("w")) {
    const maxDx = rect.width - 80;
    const clampedDx = Math.min(maxDx, dx);
    let proposedLeft = rect.left + clampedDx;
    if (proposedLeft < 0) {
      proposedLeft = 0;
    }
    width = (rect.left + rect.width) - proposedLeft;
    left = proposedLeft;
  }

  if (direction.includes("s")) {
    height = Math.max(80, rect.height + dy);
    if (boardHeight && (top + height > boardHeight)) {
      height = Math.max(80, boardHeight - top);
    }
  } else if (direction.includes("n")) {
    const maxDy = rect.height - 80;
    const clampedDy = Math.min(maxDy, dy);
    let proposedTop = rect.top + clampedDy;
    if (proposedTop < 0) {
      proposedTop = 0;
    }
    height = (rect.top + rect.height) - proposedTop;
    top = proposedTop;
  }

  return { top, left, width, height };
};

function handleMemoResizeStart(e) {
  if (e.which === 1 || e.touches) {
    decreaseAllMemoIndexes();

    activeMemo = e.target.parentNode;
    activeMemo.classList.add("active");
    activeMemo.style.zIndex = STATIC_INDEX;

    const textarea = activeMemo.querySelectorAll(".input")[0];
    textarea.blur();

    const direction = e.target.getAttribute("data-direction") || "se";
    activeResizeDirection = direction;

    document.body.style.cursor = RESIZE_CURSORS[direction] || "nwse-resize";

    const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
    const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

    currentMouse = { x, y };
    currentRect = {
      top: parseInt(activeMemo.style.top, 10) || activeMemo.offsetTop,
      left: parseInt(activeMemo.style.left, 10) || activeMemo.offsetLeft,
      width: parseInt(activeMemo.style.width, 10) || activeMemo.clientWidth,
      height: parseInt(activeMemo.style.height, 10) || activeMemo.clientHeight
    };

    document.addEventListener("mousemove", handleMemoResizeMove, { passive: false, useCapture: false });
    document.addEventListener("touchmove", handleMemoResizeMove, { passive: false, useCapture: false });

    document.addEventListener("mouseup", handleMemoResizeEnd, { passive: false, useCapture: false });
    document.addEventListener("touchcancel", handleMemoResizeEnd, { passive: false, useCapture: false });
    document.addEventListener("touchend", handleMemoResizeEnd, { passive: false, useCapture: false });
  }
};

function handleMemoResizeMove(e) {
  const isActive = activeMemo && activeMemo.classList.contains("active");

  if (isActive && activeResizeDirection && currentRect) {
    const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
    const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

    const dx = x - currentMouse.x;
    const dy = y - currentMouse.y;

    const { top, left, width, height } = calculateMemoResize(
      activeResizeDirection,
      currentRect,
      dx,
      dy,
      board.clientWidth,
      board.clientHeight
    );

    activeMemo.style.top = `${top}px`;
    activeMemo.style.left = `${left}px`;
    activeMemo.style.width = `${width}px`;
    activeMemo.style.height = `${height}px`;
  }
};

function handleMemoResizeEnd(e) {
  const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX, GRID_SIZE) : snapToGrid(e.clientX, GRID_SIZE);
  const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY, GRID_SIZE) : snapToGrid(e.clientY, GRID_SIZE);

  if (activeMemo && activeResizeDirection && currentRect) {
    const dx = x - currentMouse.x;
    const dy = y - currentMouse.y;

    const { top, left, width, height } = calculateMemoResize(
      activeResizeDirection,
      currentRect,
      dx,
      dy,
      board.clientWidth,
      board.clientHeight
    );

    activeMemo.style.top = `${top}px`;
    activeMemo.style.left = `${left}px`;
    activeMemo.style.width = `${width}px`;
    activeMemo.style.height = `${height}px`;

    activeMemo.classList.remove("active");

    const textarea = activeMemo.querySelectorAll(".input")[0];
    textarea.focus();

    const id = activeMemo.dataset.id;
    const memos = getCurrentTabMemos();
    memos[id] = {
      ...memos[id],
      position: { top, left },
      size: { width, height }
    };
    saveCurrentTabMemos(memos);
  } else if (activeMemo) {
    activeMemo.classList.remove("active");
  }

  document.body.style.cursor = null;
  activeMemo = null;
  currentRect = null;
  currentMouse = null;
  activeResizeDirection = null;

  document.removeEventListener("mousemove", handleMemoResizeMove, { passive: false, useCapture: false });
  document.removeEventListener("touchmove", handleMemoResizeMove, { passive: false, useCapture: false });

  document.removeEventListener("mouseup", handleMemoResizeEnd, { passive: false, useCapture: false });
  document.removeEventListener("touchcancel", handleMemoResizeEnd, { passive: false, useCapture: false });
  document.removeEventListener("touchend", handleMemoResizeEnd, { passive: false, useCapture: false });
};

/*
  Board Functions and Handlers
*/

function handleBoardDragStart(e) {
  if (e.which === 1 || e.touches) {
    document.body.style.cursor = "crosshair";

    board.classList.add("active");

    const rect = board.getBoundingClientRect();
    const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX - rect.left, GRID_SIZE) : snapToGrid(e.clientX - rect.left, GRID_SIZE);
    const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY - rect.top, GRID_SIZE) : snapToGrid(e.clientY - rect.top, GRID_SIZE);

    currentMouse = { x, y };

    selection = document.createElement("div");
    selection.setAttribute("id", "selection");
    selection.style.zIndex = DRAG_INDEX;

    board.appendChild(selection);

    document.addEventListener("mousemove", handleBoardDragMove);
    document.addEventListener("touchmove", handleBoardDragMove);

    document.addEventListener("mouseup", handleBoardDragEnd);
    document.addEventListener("touchcancel", handleBoardDragEnd);
    document.addEventListener("touchend", handleBoardDragEnd);
  }
};

function handleBoardDragMove(e) {
  const rect = board.getBoundingClientRect();
  const x = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientX - rect.left, GRID_SIZE) : snapToGrid(e.clientX - rect.left, GRID_SIZE);
  const y = (e.touches && e.touches.length > 0) ? snapToGrid(e.touches[0].clientY - rect.top, GRID_SIZE) : snapToGrid(e.clientY - rect.top, GRID_SIZE);

  const top = (y - currentMouse.y < 0) ? y : currentMouse.y;
  const left = (x - currentMouse.x < 0) ? x : currentMouse.x;
  const width = Math.abs(x - currentMouse.x) + 1;
  const height = Math.abs(y - currentMouse.y) + 1;

  selection.style.top = `${top}px`;
  selection.style.left = `${left}px`;
  selection.style.width = `${width}px`;
  selection.style.height = `${height}px`;
};

function handleBoardDragEnd(e) {
  const boardRect = board.getBoundingClientRect();
  const selectionRect = selection.getBoundingClientRect();

  const width = selectionRect.width - 2;
  const height = selectionRect.height - 2;

  let top = selectionRect.top - boardRect.top;
  let left = selectionRect.left - boardRect.left;

  const bounds = checkBounds(boardRect, selectionRect);

  if (bounds) {
    if (bounds.edge === "top") {
      top = bounds.offset;
    } else if (bounds.edge === "bottom") {
      top = bounds.offset;
    } else if (bounds.edge === "left") {
      left = bounds.offset;
    } else if (bounds.edge === "right") {
      left = bounds.offset;
    }
  }

  if (width >= 80 && height >= 80) {
    const id = generateUUID();
    const memo = createMemo(id, null, { top, left }, { width, height });
    board.appendChild(memo);

    const textarea = memo.querySelectorAll(".input")[0];
    textarea.focus();

    const memos = getCurrentTabMemos();
    memos[id] = { text: null, position: { top, left }, size: { width, height } };
    saveCurrentTabMemos(memos);

    activeMemo = memo;
  }

  document.body.style.cursor = null;
  board.classList.remove("active");
  board.removeChild(selection);

  document.removeEventListener("mousemove", handleBoardDragMove, { passive: false, useCapture: false });
  document.removeEventListener("touchmove", handleBoardDragMove, { passive: false, useCapture: false });

  document.removeEventListener("mouseup", handleBoardDragEnd, { passive: false, useCapture: false });
  document.removeEventListener("touchcancel", handleBoardDragEnd, { passive: false, useCapture: false });
  document.removeEventListener("touchend", handleBoardDragEnd, { passive: false, useCapture: false });
};

/*
  App Functions
*/

function toggleTheme() {
  const body = document.querySelector("body");
  if (theme === "light") {
    body.classList.add("dark");
    theme = "dark";
    setLocalStorageItem("manifest_theme", "dark");
  } else {
    body.classList.remove("dark");
    theme = "light";
    setLocalStorageItem("manifest_theme", "light");
  }

  // Redraw the canvas
  onResize();
}

function handleTheme() {
  const body = document.querySelector("body");
  const savedPreference = getLocalStorageItem("manifest_theme");

  // Prefer saved preference over OS preference
  if (savedPreference) {
    if (savedPreference === "dark") {
      body.classList.add("dark");
      theme = "dark";
      setLocalStorageItem("manifest_theme", "dark");
    } else {
      body.classList.remove("dark");
      theme = "light";
      setLocalStorageItem("manifest_theme", "light");
    }
    return;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    body.classList.add("dark");
    theme = "dark";
  }
}

function onKeydown(e) {
  if ((e.code === "KeyT" || e.keyCode === 84) && e.altKey) {
    toggleTheme();
  }
}

function onResize() {
  main.style.width = `${window.innerWidth}px`;
  main.style.height = `${window.innerHeight}px`;

  const em = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  const topOffset = Math.round((em * 2) + 24);
  const bottomMargin = MARGIN / 2;
  const leftMargin = MARGIN / 2;

  const width = (window.innerWidth - MARGIN) - 1;
  const height = (window.innerHeight - topOffset - bottomMargin) + 1;

  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);

  canvas.style.top = `${topOffset}px`;
  canvas.style.left = `${leftMargin}px`;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");

  for (let x = 0; x <= width; x += GRID_SIZE) {
    for (let y = 0; y <= height; y += GRID_SIZE) {
      context.fillStyle = theme === "light" ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.4)";
      context.beginPath();
      context.rect(x, y, 1, 1);
      context.fill();
    }
  }

  board.style.top = `${topOffset}px`;
  board.style.left = `${leftMargin}px`;
  board.style.width = `${width}px`;
  board.style.height = `${height}px`;

  currentMouse = null;
  currentRect = null;
  activeResizeDirection = null;
};

function initTabs() {
  const savedTabs = getLocalStorageItem("manifest_tabs");
  const savedActiveTab = getLocalStorageItem("manifest_active_tab");
  const legacyMemos = getLocalStorageItem("manifest_memos");

  if (savedTabs && Array.isArray(savedTabs) && savedTabs.length > 0) {
    tabs = savedTabs;
    activeTabId = (savedActiveTab && tabs.some(function (t) { return t.id === savedActiveTab; }))
      ? savedActiveTab
      : tabs[0].id;
  } else {
    const defaultTabId = generateUUID();
    tabs = [{ id: defaultTabId, title: "Tab 1" }];
    activeTabId = defaultTabId;

    if (legacyMemos && Object.keys(legacyMemos).length > 0) {
      setLocalStorageItem(`manifest_memos_${defaultTabId}`, legacyMemos);
    } else {
      const initialMemos = {};
      initialMemos[DEFAULT_MEMO.id] = {
        text: DEFAULT_MEMO.text,
        position: DEFAULT_MEMO.position,
        size: DEFAULT_MEMO.size
      };
      setLocalStorageItem(`manifest_memos_${defaultTabId}`, initialMemos);
      setLocalStorageItem("manifest_memos", initialMemos);
    }

    setLocalStorageItem("manifest_tabs", tabs);
    setLocalStorageItem("manifest_active_tab", activeTabId);
  }
};

function renderTabsUI() {
  tabsList.innerHTML = "";

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const isActive = tab.id === activeTabId;

    const tabEl = document.createElement("div");
    tabEl.classList.add("browser-tab");
    if (isActive) {
      tabEl.classList.add("active");
    }
    tabEl.setAttribute("data-id", tab.id);
    tabEl.setAttribute("title", tab.title);
    tabEl.setAttribute("draggable", "true");

    const favicon = document.createElement("span");
    favicon.classList.add("tab-favicon");
    favicon.textContent = "❏";
    tabEl.appendChild(favicon);

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("tab-title");
    titleSpan.textContent = tab.title;

    titleSpan.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      const input = document.createElement("input");
      input.type = "text";
      input.classList.add("tab-title-input");
      input.value = tab.title;
      titleSpan.replaceWith(input);
      input.focus();
      input.select();

      let finished = false;
      const finish = function (save) {
        if (finished) { return; }
        finished = true;
        if (save && input.value.trim()) {
          renameTab(tab.id, input.value.trim());
        } else {
          renderTabsUI();
        }
      };

      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          finish(true);
        } else if (ev.key === "Escape") {
          finish(false);
        }
      });
      input.addEventListener("blur", function () { finish(true); });
      input.addEventListener("mousedown", function (ev) { ev.stopPropagation(); });
      input.addEventListener("click", function (ev) { ev.stopPropagation(); });
    });

    tabEl.appendChild(titleSpan);

    const closeBtn = document.createElement("button");
    closeBtn.classList.add("tab-close-btn");
    closeBtn.setAttribute("title", "Close tab");
    closeBtn.setAttribute("aria-label", "Close tab");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", function (e) {
      closeTab(tab.id, e);
    });
    tabEl.appendChild(closeBtn);

    tabEl.addEventListener("click", function () {
      switchTab(tab.id);
    });

    tabEl.addEventListener("dragstart", function (e) {
      e.dataTransfer.effectAllowed = "move";

      dragGhostImage = tabEl.cloneNode(true);
      dragGhostImage.classList.add("drag-ghost-floating");
      dragGhostImage.style.width = `${tabEl.offsetWidth}px`;
      dragGhostImage.style.height = `${tabEl.offsetHeight}px`;
      document.body.appendChild(dragGhostImage);

      const rect = tabEl.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      e.dataTransfer.setDragImage(dragGhostImage, offsetX, offsetY);

      setTimeout(function () {
        tabEl.classList.add("tab-ghost");
      }, 0);
    });

    tabEl.addEventListener("dragend", function () {
      if (dragGhostImage && dragGhostImage.parentNode) {
        dragGhostImage.parentNode.removeChild(dragGhostImage);
        dragGhostImage = null;
      }
      tabEl.classList.remove("tab-ghost");
      finalizeTabOrder();
    });

    tabEl.addEventListener("dragover", function (e) {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        tabEl.classList.add("tab-file-drop-target");
        return;
      }

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const ghostEl = tabsList.querySelector(".tab-ghost");
      if (!ghostEl || ghostEl === tabEl) { return; }

      const rect = tabEl.getBoundingClientRect();
      const midX = rect.left + (rect.width / 2);

      if (e.clientX < midX) {
        tabsList.insertBefore(ghostEl, tabEl);
      } else {
        tabsList.insertBefore(ghostEl, tabEl.nextSibling);
      }
    });

    tabEl.addEventListener("dragleave", function () {
      tabEl.classList.remove("tab-file-drop-target");
    });

    tabEl.addEventListener("drop", function (e) {
      tabEl.classList.remove("tab-file-drop-target");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        hideDropOverlay();
        handleFileImport(e.dataTransfer.files[0], tab.id);
        return;
      }
      e.preventDefault();
      finalizeTabOrder();
    });

    tabsList.appendChild(tabEl);
  }
};

function finalizeTabOrder() {
  const currentTabEls = Array.from(tabsList.querySelectorAll(".browser-tab"));
  if (currentTabEls.length === 0) { return; }

  const newOrderIds = currentTabEls.map(function (el) { return el.dataset.id; }).filter(Boolean);

  const newTabs = [];
  for (let i = 0; i < newOrderIds.length; i++) {
    const found = tabs.find(function (t) { return t.id === newOrderIds[i]; });
    if (found) {
      newTabs.push(found);
    }
  }

  let changed = false;
  if (newTabs.length === tabs.length) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id !== newTabs[i].id) {
        changed = true;
        break;
      }
    }
  }

  if (changed) {
    tabs = newTabs;
    setLocalStorageItem("manifest_tabs", tabs);
    renderTabsUI();
  }
};

function renderCurrentTabMemos() {
  const existingMemos = board.querySelectorAll(".memo");
  for (let i = existingMemos.length - 1; i >= 0; i--) {
    board.removeChild(existingMemos[i]);
  }

  const memos = getCurrentTabMemos();
  if (memos) {
    for (const key of Object.keys(memos)) {
      const memo = createMemo(key, memos[key].text, memos[key].position, memos[key].size);
      board.appendChild(memo);
    }
  }
};

function switchTab(newTabId) {
  if (activeTabId === newTabId) { return; }
  activeTabId = newTabId;
  setLocalStorageItem("manifest_active_tab", activeTabId);
  renderTabsUI();
  renderCurrentTabMemos();
};

function addTab() {
  const newId = generateUUID();
  const nextNumber = tabs.length + 1;
  const title = `Tab ${nextNumber}`;
  tabs.push({ id: newId, title: title });
  setLocalStorageItem("manifest_tabs", tabs);
  setLocalStorageItem(`manifest_memos_${newId}`, {});
  switchTab(newId);
};

function closeTab(tabId, e) {
  if (e) {
    e.stopPropagation();
  }

  function doClose() {
    const index = tabs.findIndex(function (t) { return t.id === tabId; });
    tabs = tabs.filter(function (t) { return t.id !== tabId; });
    setLocalStorageItem("manifest_tabs", tabs);
    window.localStorage.removeItem(`manifest_memos_${tabId}`);

    if (activeTabId === tabId) {
      const nextTab = tabs[index] || tabs[index - 1] || tabs[0];
      activeTabId = nextTab.id;
      setLocalStorageItem("manifest_active_tab", activeTabId);
      renderTabsUI();
      renderCurrentTabMemos();
    } else {
      renderTabsUI();
    }
  };

  if (tabs.length <= 1) {
    confirm("Reset this tab? All notes on this tab will be cleared.").then(function (ok) {
      if (ok) {
        saveCurrentTabMemos({});
        renderCurrentTabMemos();
      }
    });
    return;
  }

  const tabToClose = tabs.find(function (t) { return t.id === tabId; });
  const tabMemos = getLocalStorageItem(`manifest_memos_${tabId}`) || {};
  const hasNotes = Object.keys(tabMemos).length > 0;

  if (hasNotes) {
    const tabName = tabToClose ? tabToClose.title : "this tab";
    confirm(`Are you sure you want to close "${tabName}"? All notes in this tab will be deleted.`).then(function (ok) {
      if (ok) {
        doClose();
      }
    });
  } else {
    doClose();
  }
};

function renameTab(tabId, newTitle) {
  const tab = tabs.find(function (t) { return t.id === tabId; });
  if (tab) {
    tab.title = newTitle;
    setLocalStorageItem("manifest_tabs", tabs);
    renderTabsUI();
  }
};

function showDropOverlay() {
  if (dropOverlay) {
    dropOverlay.classList.add("active");
  }
};

function hideDropOverlay() {
  dragCounter = 0;
  if (dropOverlay) {
    dropOverlay.classList.remove("active");
  }
};

function extractMemos(data) {
  if (!data) { return []; }

  if (Array.isArray(data)) {
    return data;
  }

  if (data.memos) {
    if (Array.isArray(data.memos)) {
      return data.memos;
    }
    if (typeof data.memos === "object") {
      return Object.keys(data.memos).map(function (k) {
        return { id: k, ...data.memos[k] };
      });
    }
  }

  if (data.manifest_memos) {
    if (Array.isArray(data.manifest_memos)) {
      return data.manifest_memos;
    }
    if (typeof data.manifest_memos === "object") {
      return Object.keys(data.manifest_memos).map(function (k) {
        return { id: k, ...data.manifest_memos[k] };
      });
    }
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    const looksLikeMemos = keys.some(function (k) {
      const v = data[k];
      return v && typeof v === "object" && ("text" in v || "position" in v || "size" in v);
    });
    if (looksLikeMemos) {
      return keys.map(function (k) {
        return { id: k, ...data[k] };
      });
    }
  }

  return [];
};

function handleFileImport(file, targetTabId) {
  if (!file) { return; }

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const parsed = JSON.parse(event.target.result);
      const memoList = extractMemos(parsed);

      if (!memoList || memoList.length === 0) {
        confirm("No valid memos found in this JSON file.").then(function () {});
        return;
      }

      const targetTab = tabs.find(function (t) { return t.id === targetTabId; }) || tabs[0];
      const targetName = targetTab ? targetTab.title : "current tab";

      confirm(`Import ${memoList.length} memo(s) into "${targetName}"?`).then(function (ok) {
        if (!ok) { return; }

        const existingMemos = getLocalStorageItem(`manifest_memos_${targetTab.id}`) || {};

        memoList.forEach(function (m) {
          const text = typeof m.text === "string" ? m.text : "";
          const position = (m.position && typeof m.position.top === "number" && typeof m.position.left === "number")
            ? m.position
            : { top: snapToGrid(100, GRID_SIZE), left: snapToGrid(100, GRID_SIZE) };
          const size = (m.size && typeof m.size.width === "number" && typeof m.size.height === "number")
            ? m.size
            : { width: 160, height: 160 };
          const memoId = (m.id && !existingMemos[m.id]) ? m.id : generateUUID();

          existingMemos[memoId] = {
            id: memoId,
            text: text,
            position: position,
            size: size
          };
        });

        setLocalStorageItem(`manifest_memos_${targetTab.id}`, existingMemos);

        if (activeTabId === targetTab.id) {
          setLocalStorageItem("manifest_memos", existingMemos);
          renderCurrentTabMemos();
        } else {
          switchTab(targetTab.id);
        }
      });
    } catch (err) {
      confirm("Failed to read JSON: Invalid file format.").then(function () {});
    }
  };
  reader.readAsText(file);
};

function setupFileDrop() {
  window.addEventListener("dragenter", function (e) {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      dragCounter++;
      showDropOverlay();
    }
  });

  window.addEventListener("dragleave", function (e) {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      dragCounter--;
      if (dragCounter <= 0) {
        hideDropOverlay();
      }
    }
  });

  window.addEventListener("dragover", function (e) {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });

  window.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      hideDropOverlay();
      handleFileImport(e.dataTransfer.files[0], activeTabId);
    }
  });
};

window.exportManifest = function () {
  const memos = {};
  if (Array.isArray(tabs)) {
    tabs.forEach(function (t) {
      const m = getLocalStorageItem(`manifest_memos_${t.id}`) || {};
      Object.assign(memos, m);
    });
  }
  const legacy = getLocalStorageItem("manifest_memos") || {};
  Object.assign(memos, legacy);

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    memos: memos
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manifest-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

function onLoad() {
  handleTheme();

  dropOverlay = document.createElement("div");
  dropOverlay.setAttribute("id", "file-drop-overlay");
  const dropBox = document.createElement("div");
  dropBox.classList.add("drop-box");
  dropBox.textContent = "Drop .json here to import memos";
  dropOverlay.appendChild(dropBox);
  document.body.appendChild(dropOverlay);

  setupFileDrop();

  main = document.createElement("main");
  main.setAttribute("id", "app");

  canvas = document.createElement("canvas");
  canvas.setAttribute("id", "grid");

  board = document.createElement("section");
  board.setAttribute("id", "board");

  board.addEventListener("mousedown", onMouseDown, { passive: false, useCapture: false });
  board.addEventListener("touchstart", onMouseDown, { passive: false, useCapture: false });

  main.appendChild(canvas);
  main.appendChild(board);
  document.body.appendChild(main);

  document.body.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { passive: false, useCapture: false });

  tabsContainer = document.createElement("header");
  tabsContainer.setAttribute("id", "browser-tabs");
  tabsContainer.classList.add("browser-tabs-bar");
  tabsContainer.addEventListener("mousedown", function (e) { e.stopPropagation(); });
  tabsContainer.addEventListener("touchstart", function (e) { e.stopPropagation(); });

  tabsList = document.createElement("div");
  tabsList.classList.add("tabs-list");

  tabsList.addEventListener("dragover", function (e) {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const ghostEl = tabsList.querySelector(".tab-ghost");
    if (!ghostEl) { return; }

    const lastTab = tabsList.lastElementChild;
    if (lastTab && lastTab !== ghostEl) {
      const rect = lastTab.getBoundingClientRect();
      if (e.clientX > rect.right) {
        tabsList.appendChild(ghostEl);
      }
    }
  });

  tabsList.addEventListener("drop", function (e) {
    e.preventDefault();
    finalizeTabOrder();
  });

  const addBtn = document.createElement("button");
  addBtn.classList.add("new-tab-btn");
  addBtn.setAttribute("title", "New Tab");
  addBtn.setAttribute("aria-label", "New Tab");
  addBtn.textContent = "+";
  addBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    addTab();
  });

  tabsContainer.appendChild(tabsList);
  tabsContainer.appendChild(addBtn);
  document.body.appendChild(tabsContainer);

  initTabs();
  renderTabsUI();
  renderCurrentTabMemos();

  onResize();
};

window.addEventListener("resize", onResize);
window.addEventListener("load", onLoad);
window.addEventListener("keydown", onKeydown);
