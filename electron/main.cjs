const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Видео-кодеки/WebCodecs: включаем аппаратное ускорение и разрешаем автоплей медиа
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#050506',
    title: 'TripleCut',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // экспорт не должен замедляться при сворачивании окна
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Внешние ссылки открываем в браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
