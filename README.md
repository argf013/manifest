
# ❏ Manifest

[![GitHub Release](https://img.shields.io/github/release/jonathontoon/manifest.svg)](https://github.com/jonathontoon/manifest/releases/latest)
[![Size](https://img.shields.io/bundlephobia/minzip/manifest?style=flat)](https://github.com/jonathontoon/manifest/releases/latest)
[![Project License](https://img.shields.io/github/license/jonathontoon/manifest.svg)](https://github.com/jonathontoon/manifest/blob/master/LICENSE)

![Manifest](https://i.imgur.com/coVQEf1.png)


### Table of Contents

- [Introduction](#introduction)
- [Key Features](#key-features)
- [Usage & Interactions](#usage--interactions)
  - [Tabs Management](#tabs-management)
  - [Notes & Resizing](#notes--resizing)
  - [Import & Export](#import--export)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [FAQ](#faq)
- [Report Bugs](#report-bugs)
- [Donate](#donate)
- [Acknowledgements](#acknowledgements)

---

## Introduction

Manifest is a minimal, grid-based pinboard for note taking. Simply click and drag anywhere on the canvas to create a note and snap it to the dynamic grid set by your window size. All notes can be repositioned, resized from any edge or corner, and organized across multiple workspaces using browser-like tabs.

Everything runs offline and is stored locally in your browser's `localStorage`—no accounts, no tracking, and no external servers.

---

## Key Features

- **Grid-Snapping Pinboard**: Drag-to-create notes with automatic snapping (`GRID_SIZE = 10px`).
- **Multi-Tab Workspaces**: Organize different topics or projects across multiple tabs with drag-and-drop tab reordering.
- **Windows-Style 8-Way Memo Resize**: Resize notes fluidly from any corner or edge with dynamic cursor states.
- **Drag-and-Drop JSON Import**: Drag a `.json` backup file directly onto the board or onto a specific tab to import notes.
- **Console Data Export**: Built-in `window.exportManifest()` utility to backup notes instantly to a `.json` file.
- **Brutalist Dialogs**: Bespoke confirmation modals designed to match Manifest's monochrome aesthetic, complete with keyboard shortcuts (<kbd>Enter</kbd> / <kbd>Esc</kbd>).
- **Light & Dark Themes**: Follows OS preferences by default, toggleable via keyboard shortcut.

---

## Usage & Interactions

### Tabs Management
- **Create Tab**: Click the `+` button in the tab bar.
- **Switch Tab**: Click on any tab to view its notes.
- **Rename Tab**: Double-click the tab title, type the new name, and press <kbd>Enter</kbd> (or <kbd>Esc</kbd> to cancel).
- **Reorder Tabs**: Drag and drop any tab along the tab bar with real-time placeholder ghost preview.
- **Close Tab**: Click the `×` button on the tab. A custom confirmation modal will appear if the tab contains notes.

![Tabs Demo](https://i.imgur.com/0dvl4B2.png) 

### Notes & Resizing
- **Create Note**: Click and drag on an empty area of the board.
- **Move Note**: Click and drag from the note's top title bar.
- **Resize Note**: Hover over any of the 8 handles (corners: `nw`, `ne`, `se`, `sw` or edges: `n`, `s`, `e`, `w`) and drag. Notes respect board boundaries and minimum dimensions (80×80px).
- **Delete Note**: Click the `–` button in the top-left corner of the note.

<video autoplay loop muted playsinline>
  <source src="https://i.imgur.com/Ji2Rpoz.mp4" type="video/mp4">
</video>

### Import & Export

#### Migrating / Exporting from `manifest.app`
If you have existing notes on [manifest.app](https://manifest.app) or an older instance of Manifest, open your browser DevTools (<kbd>F12</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd>) on that page, paste the following snippet into the **Console**, and press <kbd>Enter</kbd>:

```javascript
(() => {
  const memos = {};

  // Retrieve data from tabbed format
  const tabs = JSON.parse(
    localStorage.getItem("manifest_tabs") || "null"
  );

  if (Array.isArray(tabs)) {
    tabs.forEach((tab) => {
      const memoData = JSON.parse(
        localStorage.getItem(`manifest_memos_${tab.id}`) || "{}"
      );

      Object.assign(memos, memoData);
    });
  }

  // Retrieve data from legacy single-board format
  const legacy = JSON.parse(
    localStorage.getItem("manifest_memos") || "{}"
  );

  Object.assign(memos, legacy);

  // Retrieve any remaining manifest_memos_* keys
  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith("manifest_memos")) {
      return;
    }

    try {
      const value = JSON.parse(localStorage.getItem(key));

      if (value && typeof value === "object") {
        Object.assign(memos, value);
      }
    } catch {
      // Ignore invalid JSON data
    }
  });

  const count = Object.keys(memos).length;

  if (count === 0) {
    console.warn(
      "No memos found in this browser's localStorage."
    );
    return;
  }

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    memos,
  };

  const blob = new Blob(
    [JSON.stringify(exportPayload, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `manifest-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);

  console.log(
    `Successfully exported ${count} memo(s) to ${anchor.download}`
  );
})();
```

This will automatically trigger a download of `manifest-export-YYYY-MM-DD.json`.

#### Importing Notes
Drag and drop your exported `.json` file anywhere into this app:
- **Drop onto a specific tab**: Notes will be imported directly into that target tab.
- **Drop onto the board/canvas**: Notes will be imported into the currently active tab.
A confirmation dialog will show the number of memos to be imported before applying.

<video autoplay loop muted playsinline>
  <source src="https://i.imgur.com/061tt2B.mp4" type="video/mp4">
</video>

#### Exporting Notes (Current App)
- Run `exportManifest()` in the browser console at any time to download a backup file of all current notes.

### Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>T</kbd> | Toggle Light / Dark theme |
| <kbd>Enter</kbd> | Confirm action in dialog modals / Save tab rename |
| <kbd>Escape</kbd> | Cancel dialog modal / Cancel tab rename |

---

## FAQ

### 1. Is this available as some kind of web extension?
In order to avoid investing too much in a single ecosystem, there's no plan to create an extension right now.

### 2. What about a desktop app?
Manifest is a [progressive web app](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) (PWA). You can install it directly from your browser as a standalone application on macOS, Windows, and Linux.

### 3. Can Manifest work on mobile?
Manifest is not a mobile-centric product. This is intentional, as the specific experience and interactions rely on accurate pointer input. Tablet support with stylus input is a long-term goal for this project.

### 4. Does Manifest have a dark mode?
Yes. By default, it reads from your OS preference. You can toggle between light and dark mode with <kbd>Alt</kbd> + <kbd>T</kbd>, and your preference will be saved.

### 5. What is Manifest built with?
Vanilla JavaScript (ES6+), SASS, and bundled with Parcel. Zero runtime framework dependencies.

### 6. Does Manifest use any analytics or external servers?
Zero. Manifest connects to no servers; no data is ever sent outside of your browser. All data is stored locally in `localStorage`.

---

## Report Bugs
Please create a GitHub [issue](https://github.com/jonathontoon/manifest/issues) and provide as much information as possible regarding the bug, including screenshots or console logs.

## Donate
Manifest is free and will always be free. However if you'd like to contribute a small donation via [LiberaPay](https://liberapay.com/jonathontoon/) or [Stripe](https://donate.stripe.com/cN23ggaU156agSYaEF) to help pay for domain and server costs, it would be greatly appreciated.

## Acknowledgements
Thank you to [bnjm](https://www.github.com/bnjm) for help with the grid snapping logic, as well as everyone who helped test and contribute to Manifest.