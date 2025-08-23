import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BrowserWindow, ipcMain } from 'electron';

const execAsync = promisify(exec);

export interface FileOperation {
  path: string;
  content?: string;
  operation: 'read' | 'write' | 'delete' | 'exists';
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

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  // ===== OPERACIONES DE ARCHIVOS =====
  
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
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
      
      await fs.writeFile(filePath, content, 'utf-8');
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
        .filter(file => file.isFile())
        .map(file => path.join(directory, file.name));

      if (pattern) {
        const regex = new RegExp(pattern);
        fileList = fileList.filter(file => regex.test(file));
      }

      return fileList;
    } catch (error) {
      throw new Error(`Failed to list files in ${directory}: ${error}`);
    }
  }

  async listDirectories(directory: string): Promise<string[]> {
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      return items
        .filter(item => item.isDirectory())
        .map(item => path.join(directory, item.name));
    } catch (error) {
      throw new Error(`Failed to list directories in ${directory}: ${error}`);
    }
  }

  // ===== EJECUCIÓN DE COMANDOS =====
  
  async executeCommand(command: string, cwd?: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: cwd || process.cwd(),
        timeout: 30000 // 30 segundos timeout
      });
      
      return {
        success: true,
        output: stdout,
        error: stderr || undefined
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message || 'Unknown error'
      };
    }
  }

  async executeCommandWithStream(command: string, cwd?: string): Promise<NodeJS.ReadableStream> {
    const child = exec(command, { 
      cwd: cwd || process.cwd() 
    });
    
    return child.stdout!;
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
      this.mainWindow.webContents.send('show-diff', diffData);
      
      // Escuchar respuesta del usuario
      const handler = (event: any, approved: boolean) => {
        ipcMain.removeListener('diff-response', handler);
        resolve(approved);
      };
      
      ipcMain.once('diff-response', handler);
    });
  }

  async showToolApproval(tool: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.mainWindow) {
        resolve(false);
        return;
      }

      // Enviar solicitud de aprobación al renderer
      this.mainWindow.webContents.send('tool-approval-request', tool);
      
      // Escuchar respuesta del usuario
      const handler = (event: any, approved: boolean) => {
        ipcMain.removeListener('tool-approval-response', handler);
        resolve(approved);
      };
      
      ipcMain.once('tool-approval-response', handler);
    });
  }

  async showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.send('show-message', { message, type });
  }

  async showProgress(message: string, progress: number): Promise<void> {
    if (!this.mainWindow) return;

    this.mainWindow.webContents.send('show-progress', { message, progress });
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
      throw new Error(`Failed to get file modified time for ${filePath}: ${error}`);
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
  
  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // También enviar al renderer si está disponible
    if (this.mainWindow) {
      this.mainWindow.webContents.send('log-message', { message: logMessage, level });
    }
  }

  // ===== LIMPIEZA =====
  
  dispose(): void {
    // Limpiar recursos si es necesario
    this.mainWindow = null;
  }
} 