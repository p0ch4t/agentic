import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as os from "os";
import { ElectronController } from "./core/controller/ElectronController";

class Main {
  private controller: ElectronController | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // Controller will be initialized after window creation
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
        preload: path.join(__dirname, "preload.js"),
      },
      titleBarStyle: "default",
      show: true,
      center: true,
      title: "Cline Desktop",
    });

    // Cargar la interfaz de usuario
    const htmlPath = path.join(__dirname, "../renderer/index.html");
    console.log("Loading HTML from:", htmlPath);
    await this.mainWindow.loadFile(htmlPath);

    // Mostrar la ventana cuando esté lista
    this.mainWindow.once("ready-to-show", () => {
      console.log("Window ready to show");
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    // Agregar listeners para debugging
    this.mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {
        console.error("Failed to load page:", errorCode, errorDescription);
      },
    );

    this.mainWindow.webContents.on("did-finish-load", () => {
      console.log("Page loaded successfully");
    });

    // Manejar el cierre de la ventana
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers() {
    // Limpiar handlers existentes para evitar duplicados
    ipcMain.removeAllListeners("webview-message");
    ipcMain.removeAllListeners("get-state");
    ipcMain.removeAllListeners("start-task");
    ipcMain.removeAllListeners("approve-tool");
    ipcMain.removeAllListeners("get-task-status");
    ipcMain.removeAllListeners("select-files");
    ipcMain.removeAllListeners("select-directory");
    ipcMain.removeAllListeners("show-message");
    ipcMain.removeAllListeners("send-ai-message");
    ipcMain.removeAllListeners("reject-tool");
    ipcMain.removeAllListeners("get-pending-tools");
    ipcMain.removeAllListeners("get-conversation-history");
    ipcMain.removeAllListeners("clear-conversation");
    ipcMain.removeAllListeners("update-ai-config");
    ipcMain.removeAllListeners("get-ai-config");
    ipcMain.removeAllListeners("is-ai-processing");
    ipcMain.removeAllListeners("log-from-renderer");

    // Handler para mensajes del webview
    ipcMain.handle("webview-message", async (event, message) => {
      try {
        if (!this.controller) {
          throw new Error("Controller not initialized");
        }
        return await this.controller.handleWebviewMessage(message);
      } catch (error) {
        console.error("Error handling webview message:", error);
        throw error;
      }
    });

    // Handler para obtener estado
    ipcMain.handle("get-state", async (event) => {
      try {
        if (!this.controller) {
          throw new Error("Controller not initialized");
        }
        return await this.controller.getState();
      } catch (error) {
        console.error("Error getting state:", error);
        throw error;
      }
    });

    // Legacy handler para iniciar una tarea
    ipcMain.handle("start-task", async (event, description: string) => {
      try {
        if (!this.controller) {
          throw new Error("Controller not initialized");
        }
        await this.controller.startTask(description);
        return { success: true };
      } catch (error) {
        console.error("Error starting task:", error);
        throw error;
      }
    });

    // Legacy handlers - mantener compatibilidad con la UI existente

    ipcMain.handle("get-task-status", async (event) => {
      try {
        // TODO: Implementar estado de tarea
        return { isRunning: false };
      } catch (error) {
        console.error("Error getting task status:", error);
        throw error;
      }
    });

    // Handler para seleccionar archivos
    ipcMain.handle("select-files", async (event, options: any) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "All Files", extensions: ["*"] },
            {
              name: "Text Files",
              extensions: ["txt", "md", "js", "ts", "py", "java", "cpp", "c"],
            },
          ],
        });
        return result;
      } catch (error) {
        console.error("Error selecting files:", error);
        throw error;
      }
    });

    // Handler para seleccionar directorio
    ipcMain.handle("select-directory", async (event) => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ["openDirectory"],
        });
        return result;
      } catch (error) {
        console.error("Error selecting directory:", error);
        throw error;
      }
    });

    // Handler para mostrar mensaje
    ipcMain.handle("show-message", async (event, options: any) => {
      try {
        const result = await dialog.showMessageBox(this.mainWindow!, options);
        return result;
      } catch (error) {
        console.error("Error showing message:", error);
        throw error;
      }
    });

    // ===== HANDLERS PARA IA CONVERSACIONAL =====

    // Handler para enviar mensaje a la IA
    ipcMain.handle("send-ai-message", async (event, message: string) => {
      try {
        console.log(
          "📨 [Main] Received send-ai-message request:",
          message.substring(0, 100) + "...",
        );
        console.log("🔧 [Main] Controller available:", !!this.controller);

        const result = await this.controller?.handleWebviewMessage({
          type: "askCline",
          text: message,
        });

        console.log("✅ [Main] AI message processed successfully:", {
          hasResult: !!result,
          resultType: typeof result,
          hasSuccess: !!result?.success,
          hasError: !!result?.error,
        });

        return result;
      } catch (error) {
        console.error("❌ [Main] Error sending AI message:", error);
        console.error("❌ [Main] Error details:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : "No stack trace",
          userMessage: message.substring(0, 200),
        });
        throw error;
      }
    });

    // Handler para aprobar y ejecutar herramienta
    ipcMain.handle("approve-tool", async (event, toolCallId: string) => {
      try {
        // TODO: Implementar aprobación de herramientas
        return { success: true };
      } catch (error) {
        console.error("Error approving tool:", error);
        throw error;
      }
    });

    // Handler para rechazar herramienta
    ipcMain.handle("reject-tool", async (event, toolCallId: string) => {
      try {
        // TODO: Implementar rechazo de herramientas
        return { success: true };
      } catch (error) {
        console.error("Error rejecting tool:", error);
        throw error;
      }
    });

    // Handler para aprobar comando
    ipcMain.handle("approve-command", async (event, commandId: string) => {
      try {
        console.log(`✅ [Main] Approving command: ${commandId}`);
        const result = await this.controller?.handleWebviewMessage({
          type: "approveCommand",
          commandId: commandId,
        });
        console.log(`✅ [Main] Command approval result:`, result);
        return result;
      } catch (error) {
        console.error("❌ [Main] Error approving command:", error);
        throw error;
      }
    });

    // Handler para rechazar comando
    ipcMain.handle("reject-command", async (event, commandId: string) => {
      try {
        console.log(`❌ [Main] Rejecting command: ${commandId}`);
        const result = await this.controller?.handleWebviewMessage({
          type: "rejectCommand",
          commandId: commandId,
        });
        console.log(`✅ [Main] Command rejection result:`, result);
        return result;
      } catch (error) {
        console.error("❌ [Main] Error rejecting command:", error);
        throw error;
      }
    });

    // Handler para obtener herramientas pendientes
    ipcMain.handle("get-pending-tools", async (event) => {
      try {
        // TODO: Implementar herramientas pendientes
        return [];
      } catch (error) {
        console.error("Error getting pending tools:", error);
        throw error;
      }
    });

    // Handler para obtener historial de conversación
    ipcMain.handle("get-conversation-history", async (event) => {
      try {
        // TODO: Implementar historial de conversación
        return [];
      } catch (error) {
        console.error("Error getting conversation history:", error);
        throw error;
      }
    });

    // Handler para limpiar conversación
    ipcMain.handle("clear-conversation", async (event) => {
      try {
        // Limpiar tarea y memoria manualmente (independiente de configuración)
        await this.controller?.clearTask();
        await this.controller?.clearMemoryManually();
        return { success: true };
      } catch (error) {
        console.error("Error clearing conversation:", error);
        throw error;
      }
    });

    // Handler para detener razonamiento continuo
    ipcMain.handle("stop-continuous-reasoning", async (event) => {
      try {
        console.log("🛑 [Main] Stop continuous reasoning requested");
        this.controller?.stopContinuousReasoning();
        return { success: true };
      } catch (error) {
        console.error("Error stopping continuous reasoning:", error);
        throw error;
      }
    });

    // Handler para verificar si el razonamiento continuo está activo
    ipcMain.handle("is-continuous-reasoning-active", async (event) => {
      try {
        const isActive =
          this.controller?.isContinuousReasoningActive() || false;
        return { active: isActive };
      } catch (error) {
        console.error("Error checking continuous reasoning status:", error);
        throw error;
      }
    });

    // Handler para actualizar configuración de IA
    ipcMain.handle("update-ai-config", async (event, config: any) => {
      try {
        await this.controller?.updateApiConfiguration(config);
        return { success: true };
      } catch (error) {
        console.error("Error updating AI config:", error);
        throw error;
      }
    });

    // Handler para obtener configuración de IA
    ipcMain.handle("get-ai-config", async (event) => {
      try {
        return await this.controller?.getFullConfiguration();
      } catch (error) {
        console.error("Error getting AI config:", error);
        throw error;
      }
    });

    // Handler para verificar si la IA está procesando
    ipcMain.handle("is-ai-processing", async (event) => {
      try {
        return this.controller?.task ? true : false;
      } catch (error) {
        console.error("Error checking AI processing status:", error);
        throw error;
      }
    });

    // Handler para logs del renderer
    ipcMain.handle("log-from-renderer", async (event, message) => {
      console.log(message);
      return true;
    });
  }

  async initialize() {
    // Crear la ventana principal primero
    await this.createWindow();

    // Inicializar el controller
    const storageDir = path.join(os.homedir(), ".cline-desktop");
    this.controller = new ElectronController({
      mainWindow: this.mainWindow!,
      storageDir,
    });

    // Esperar a que el controller esté completamente inicializado
    await this.controller.initialize();

    // Configurar handlers IPC después de que el controller esté listo
    this.setupIpcHandlers();

    console.log("Main initialized successfully");
  }
}

// Inicializar la aplicación cuando Electron esté listo
app.whenReady().then(async () => {
  const main = new Main();
  await main.initialize();
});

// Salir cuando todas las ventanas estén cerradas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
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
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) {
        windows[0].restore();
      }
      windows[0].focus();
    }
  });
}
