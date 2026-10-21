import path from 'path';
import { BrowserWindow } from 'electron';

export function createMainWindow({
  startUrl,
  preloadPath,
  iconPath,
  isDev,
  baseDir
}) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    focusable: true,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath || path.join(baseDir, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    }
  });

  win.setMenu(null);
  
  win.loadURL(startUrl);

  win.once('ready-to-show', () => win.show());
  win.on('blur', () => console.log('Window lost focus'));
  win.on('focus', () => console.log('Window focused'));
  win.on('focus', () => console.log(baseDir));

  if (isDev) {
    win.webContents.openDevTools();
  }

  return win;
}


