import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { ClineDesktopApp } from './ui/ClineDesktopApp';

class Main {
  private clineApp: ClineDesktopApp;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.clineApp = new ClineDesktopApp();
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: true,
      center: true,
      title: 'Cline Desktop'
    });

    // Cargar la interfaz de usuario
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    await this.mainWindow.loadFile(htmlPath);

    // Mostrar la ventana cuando esté lista
    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Agregar listeners para debugging
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load page:', errorCode, errorDescription);
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page loaded successfully');
    });

    // Manejar el cierre de la ventana
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Configurar handlers IPC
    this.setupIpcHandlers();
  }

  private setupIpcHandlers() {
    // Handler para iniciar una tarea
    ipcMain.handle('start-task', async (event, description: string) => {
      try {
        return await this.clineApp.startTask(description);
      } catch (error) {
        console.error('Error starting task:', error);
        throw error;
      }
    });

    // Handler para aprobar ejecución de herramientas
    ipcMain.handle('approve-tool', async (event, tool: any) => {
      try {
        return await this.clineApp.approveToolExecution(tool);
      } catch (error) {
        console.error('Error approving tool:', error);
        throw error;
      }
    });

    // Handler para obtener estado de la tarea
    ipcMain.handle('get-task-status', async (event) => {
      try {
        return await this.clineApp.getTaskStatus();
      } catch (error) {
        console.error('Error getting task status:', error);
        throw error;
      }
    });

    // Handler para seleccionar archivos
    ipcMain.handle('select-files', async (event, options: any) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'java', 'cpp', 'c'] }
          ]
        });
        return result;
      } catch (error) {
        console.error('Error selecting files:', error);
        throw error;
      }
    });

    // Handler para seleccionar directorio
    ipcMain.handle('select-directory', async (event) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ['openDirectory']
        });
        return result;
      } catch (error) {
        console.error('Error selecting directory:', error);
        throw error;
      }
    });

    // Handler para mostrar mensaje
    ipcMain.handle('show-message', async (event, options: any) => {
      try {
        const result = await dialog.showMessageBox(this.mainWindow!, options);
        return result;
      } catch (error) {
        console.error('Error showing message:', error);
        throw error;
      }
    });
  }

  async initialize() {
    // Crear la ventana principal primero
    await this.createWindow();
    
    // Inicializar la aplicación Cline con el host provider
    const { ElectronHostProvider } = await import('./host/ElectronHostProvider');
    const hostProvider = new ElectronHostProvider(this.mainWindow!);
    this.clineApp.setHostProvider(hostProvider);
    
    // Inicializar la aplicación Cline
    await this.clineApp.initialize();
  }
}

// Inicializar la aplicación cuando Electron esté listo
app.whenReady().then(async () => {
  const main = new Main();
  await main.initialize();
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const main = new Main();
    main.initialize();
  }
});

// Prevenir múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) {
        windows[0].restore();
      }
      windows[0].focus();
    }
  });
} 