const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable Chromium hardware transparent visuals
app.commandLine.appendSwitch('enable-transparent-visuals');

let mainWindow = null;
const WIN_W = 140;
const WIN_H = 200;

const positionFilePath = path.join(app.getPath('userData'), 'slughorn-widget-position.json');

function loadSavedPosition() {
  try {
    if (fs.existsSync(positionFilePath)) {
      const raw = fs.readFileSync(positionFilePath, 'utf-8');
      const pos = JSON.parse(raw);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        const displays = screen.getAllDisplays();
        const isVisible = displays.some((d) => {
          const { x, y, width, height } = d.bounds;
          return (
            pos.x >= x - WIN_W + 30 &&
            pos.x <= x + width - 30 &&
            pos.y >= y &&
            pos.y <= y + height - 30
          );
        });

        if (isVisible) {
          return { x: pos.x, y: pos.y };
        }
      }
    }
  } catch (e) {
    console.error('Failed to load saved position:', e);
  }

  // Default position: near bottom-right of primary screen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  return {
    x: screenW - WIN_W - 35,
    y: screenH - WIN_H - 55,
  };
}

function saveCurrentPosition() {
  if (!mainWindow) return;
  try {
    const [x, y] = mainWindow.getPosition();
    fs.writeFileSync(positionFilePath, JSON.stringify({ x, y }));
  } catch (e) {
    console.error('Failed to save position:', e);
  }
}

function createWindow() {
  const initialPos = loadSavedPosition();

  mainWindow = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: initialPos.x,
    y: initialPos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    skipTaskbar: false,
    title: "Slughorn's Hourglass",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true);

  mainWindow.on('moved', () => {
    saveCurrentPosition();
  });

  const targetUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173/?mode=widget';
  mainWindow.loadURL(targetUrl);

  // Global toggle shortcut: Ctrl+Shift+H
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------------------------------------------------
// CURSOR-TO-WINDOW NATIVE DRAGGING IPC ENGINE
// -------------------------------------------------------------
let dragOffset = { x: Math.floor(WIN_W / 2), y: Math.floor(WIN_H / 2) };
let isDraggingWindow = false;

ipcMain.on('window-drag-start', (event, { mouseX, mouseY }) => {
  if (!mainWindow) return;
  isDraggingWindow = true;
  dragOffset = {
    x: typeof mouseX === 'number' ? Math.round(mouseX) : Math.floor(WIN_W / 2),
    y: typeof mouseY === 'number' ? Math.round(mouseY) : Math.floor(WIN_H / 2),
  };
});

ipcMain.on('window-drag-move', () => {
  if (!mainWindow || !isDraggingWindow) return;

  const cursor = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursor);
  const { x: dX, y: dY, width: dW, height: dH } = currentDisplay.bounds;

  let targetX = cursor.x - dragOffset.x;
  let targetY = cursor.y - dragOffset.y;

  // Clamping allows full reach to the top (y = dY = 0 on primary screen)
  const minX = dX - WIN_W + 30;
  const maxX = dX + dW - 30;
  const minY = dY; // Full top edge reach (0)
  const maxY = dY + dH - 30;

  targetX = Math.max(minX, Math.min(maxX, targetX));
  targetY = Math.max(minY, Math.min(maxY, targetY));

  mainWindow.setPosition(targetX, targetY);
});

ipcMain.on('window-drag-end', () => {
  isDraggingWindow = false;
  saveCurrentPosition();
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
