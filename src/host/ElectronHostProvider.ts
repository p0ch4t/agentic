import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { BrowserWindow, ipcMain } from "electron";
import { ElectronTerminalManager } from "../core/terminal/ElectronTerminalManager";
import { ElectronTerminalProcess } from "../core/terminal/ElectronTerminalProcess";

const execAsync = promisify(exec);

export interface FileOperation {
  path: string;
  content?: string;
  operation: "read" | "write" | "delete" | "exists";
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface DiffData {
  original: string;
  modified: string;
  filePath: string;
}

export class ElectronHostProvider {
  private mainWindow: BrowserWindow | null = null;
  private terminalManager: ElectronTerminalManager;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.terminalManager = new ElectronTerminalManager();
  }

  // ===== OPERACIONES DE ARCHIVOS =====

  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Crear directorio si no existe
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(directory: string, pattern?: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory, { withFileTypes: true });
      let fileList = files
        .filter((file) => file.isFile())
        .map((file) => path.join(directory, file.name));

      if (pattern) {
        const regex = new RegExp(pattern);
        fileList = fileList.filter((file) => regex.test(file));
      }

      return fileList;
    } catch (error) {
      throw new Error(`Failed to list files in ${directory}: ${error}`);
    }
  }

  async searchFiles(
    searchPath: string,
    regex: string,
    filePattern?: string,
  ): Promise<string> {
    try {
      const results: string[] = [];

      // Función recursiva para buscar en directorios
      const searchInDirectory = async (dirPath: string): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            // Evitar directorios comunes que no queremos buscar
            if (
              !entry.name.startsWith(".") &&
              entry.name !== "node_modules" &&
              entry.name !== "dist" &&
              entry.name !== "build"
            ) {
              await searchInDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            // Aplicar filtro de patrón de archivo si se especifica
            if (filePattern) {
              const glob = require("glob");
              if (!glob.minimatch(entry.name, filePattern)) {
                continue;
              }
            }

            try {
              // Leer el contenido del archivo
              const content = await fs.readFile(fullPath, "utf-8");
              const lines = content.split("\n");

              // Buscar coincidencias con el regex
              const regexObj = new RegExp(regex, "gm");
              let match;
              const matches: {
                line: number;
                content: string;
                context: string[];
              }[] = [];

              while ((match = regexObj.exec(content)) !== null) {
                const lineIndex =
                  content.substring(0, match.index).split("\n").length - 1;
                const contextStart = Math.max(0, lineIndex - 2);
                const contextEnd = Math.min(lines.length, lineIndex + 3);
                const context = lines.slice(contextStart, contextEnd);

                matches.push({
                  line: lineIndex + 1,
                  content: lines[lineIndex],
                  context,
                });
              }

              if (matches.length > 0) {
                const relativePath = path.relative(searchPath, fullPath);
                results.push(`\n📁 ${relativePath}`);

                for (const match of matches) {
                  results.push(
                    `   Line ${match.line}: ${match.content.trim()}`,
                  );
                  results.push(`   Context:`);
                  match.context.forEach((line, idx) => {
                    const lineNum = match.line - 2 + idx;
                    const marker = lineNum === match.line ? "→" : " ";
                    results.push(`   ${marker} ${lineNum}: ${line}`);
                  });
                  results.push("");
                }
              }
            } catch (fileError) {
              // Ignorar archivos que no se pueden leer (binarios, permisos, etc.)
              continue;
            }
          }
        }
      };

      await searchInDirectory(searchPath);

      if (results.length === 0) {
        return `No matches found for pattern "${regex}" in ${searchPath}${filePattern ? ` (files: ${filePattern})` : ""}`;
      }

      return `Search results for "${regex}" in ${searchPath}${filePattern ? ` (files: ${filePattern})` : ""}:\n${results.join("\n")}`;
    } catch (error) {
      throw new Error(
        `Failed to search files in ${searchPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async listDirectories(directory: string): Promise<string[]> {
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      return items
        .filter((item) => item.isDirectory())
        .map((item) => path.join(directory, item.name));
    } catch (error) {
      throw new Error(`Failed to list directories in ${directory}: ${error}`);
    }
  }

  // ===== EJECUCIÓN DE COMANDOS =====

  async executeCommand(command: string, cwd?: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout: 30000, // 30 segundos timeout
      });

      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message || "Unknown error",
      };
    }
  }

  async executeCommandWithStream(
    command: string,
    cwd?: string,
  ): Promise<NodeJS.ReadableStream> {
    const child = exec(command, {
      cwd: cwd || process.cwd(),
    });

    return child.stdout!;
  }

  /**
   * Execute command with real-time streaming output like the official Cline project
   */
  async executeCommandWithRealTimeStreaming(
    command: string,
    cwd?: string,
    onOutput?: (output: string) => void,
  ): Promise<CommandResult> {
    try {
      // Get or create terminal for this directory
      const terminalInfo = await this.terminalManager.getOrCreateTerminal(cwd);

      // Show terminal
      terminalInfo.terminal.show();

      // Execute command with streaming
      const process = this.terminalManager.runCommand(terminalInfo, command);

      let result = "";
      let hasOutput = false;

      // Handle real-time output
      process.on("line", (line: string) => {
        result += line + "\n";
        hasOutput = true;

        // Send output to callback if provided
        if (onOutput) {
          onOutput(line);
        }

        // Real-time display disabled for cleaner UI
        // if (this.mainWindow) {
        //   this.mainWindow.webContents.send('command-output', {
        //     command,
        //     output: line,
        //     isComplete: false
        //   });
        // }
      });

      // Wait for completion
      let completed = false;
      process.once("completed", () => {
        completed = true;
      });

      // Wait for the process to complete
      await process;

      // Completion signal disabled for cleaner UI
      // if (this.mainWindow) {
      //   this.mainWindow.webContents.send('command-output', {
      //     command,
      //     output: result,
      //     isComplete: true,
      //     exitCode: process.getExitCode()
      //   });
      // }

      if (completed) {
        return {
          success: process.getExitCode() === 0,
          output: result,
          error:
            process.getExitCode() !== 0
              ? `Command exited with code ${process.getExitCode()}`
              : undefined,
        };
      } else {
        return {
          success: true,
          output: result,
          error: "Command is still running in terminal",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message || "Unknown error",
      };
    }
  }

  // ===== OPERACIONES DEL SISTEMA =====

  async getCurrentWorkingDirectory(): Promise<string> {
    return process.cwd();
  }

  async changeWorkingDirectory(newPath: string): Promise<void> {
    try {
      process.chdir(newPath);
    } catch (error) {
      throw new Error(`Failed to change directory to ${newPath}: ${error}`);
    }
  }

  async getEnvironmentVariable(name: string): Promise<string | undefined> {
    return process.env[name];
  }

  async setEnvironmentVariable(name: string, value: string): Promise<void> {
    process.env[name] = value;
  }

  // ===== INTERFAZ DE USUARIO =====

  async showDiff(diffData: DiffData): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.mainWindow) {
        resolve(false);
        return;
      }

      // Enviar datos del diff al renderer
      this.mainWindow.webContents.send("show-diff", diffData);

      // Escuchar respuesta del usuario
      const handler = (event: any, approved: boolean) => {
        ipcMain.removeListener("diff-response", handler);
        resolve(approved);
      };

      ipcMain.once("diff-response", handler);
    });
  }

  async showToolApproval(tool: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.mainWindow) {
        resolve(false);
        return;
      }

      // Enviar solicitud de aprobación al renderer
      this.mainWindow.webContents.send("tool-approval-request", tool);

      // Escuchar respuesta del usuario
      const handler = (event: any, approved: boolean) => {
        ipcMain.removeListener("tool-approval-response", handler);
        resolve(approved);
      };

      ipcMain.once("tool-approval-response", handler);
    });
  }

  async showMessage(
    message: string,
    type: "info" | "warning" | "error" = "info",
  ): Promise<void> {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.send("show-message", { message, type });
  }

  async showProgress(message: string, progress: number): Promise<void> {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.send("show-progress", { message, progress });
  }

  // ===== UTILIDADES =====

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size for ${filePath}: ${error}`);
    }
  }

  async getFileModifiedTime(filePath: string): Promise<Date> {
    try {
      const stats = await fs.stat(filePath);
      return stats.mtime;
    } catch (error) {
      throw new Error(
        `Failed to get file modified time for ${filePath}: ${error}`,
      );
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error}`);
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to delete directory ${dirPath}: ${error}`);
    }
  }

  // ===== LOGGING =====

  log(message: string, level: "info" | "warn" | "error" = "info"): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    // También enviar al renderer si está disponible
    if (this.mainWindow) {
      this.mainWindow.webContents.send("log-message", {
        message: logMessage,
        level,
      });
    }
  }

  // ===== COMMUNICATION WITH RENDERER =====

  sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // ===== WEB REQUESTS =====

  async makeWebRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    } = {},
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    url: string;
  }> {
    const { method = "GET", headers = {}, body, timeout = 10000 } = options;

    try {
      // Validar URL
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported");
      }

      // Configurar headers por defecto
      const defaultHeaders: Record<string, string> = {
        "User-Agent": "Cline-Desktop/1.0.0 (Electron)",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      };

      // Si hay body, agregar Content-Type si no está especificado
      if (
        body &&
        !defaultHeaders["Content-Type"] &&
        !defaultHeaders["content-type"]
      ) {
        defaultHeaders["Content-Type"] = "application/json";
      }

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Hacer la solicitud
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: defaultHeaders,
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Extraer headers de respuesta
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Leer el cuerpo de la respuesta
      let responseBody: string;
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        try {
          const json = await response.json();
          responseBody = JSON.stringify(json, null, 2);
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      // Limitar el tamaño de la respuesta para evitar problemas de memoria
      if (responseBody.length > 50000) {
        responseBody =
          responseBody.substring(0, 50000) +
          "\n\n[Response truncated - content too large]";
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw new Error(`Web request failed: ${error.message}`);
      }
      throw new Error("Unknown error occurred during web request");
    }
  }

  // ===== LIMPIEZA =====

  dispose(): void {
    // Cleanup terminal manager
    this.terminalManager.disposeAll();

    // Limpiar recursos si es necesario
    this.mainWindow = null;
  }
}
