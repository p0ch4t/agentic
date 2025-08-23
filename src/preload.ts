import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Tareas del agente
  startTask: (description: string) => ipcRenderer.invoke('start-task', description),
  approveTool: (tool: any) => ipcRenderer.invoke('approve-tool', tool),
  getTaskStatus: () => ipcRenderer.invoke('get-task-status'),
  
  // Selección de archivos
  selectFiles: (options?: any) => ipcRenderer.invoke('select-files', options),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Mensajes del sistema
  showMessage: (options: any) => ipcRenderer.invoke('show-message', options),
  
  // Eventos del sistema
  onTaskUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('task-update', (event, data) => callback(data));
  },
  
  onToolRequest: (callback: (tool: any) => void) => {
    ipcRenderer.on('tool-request', (event, tool) => callback(tool));
  },
  
  onTaskComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('task-complete', (event, result) => callback(result));
  },
  
  // Limpiar listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Tipos para TypeScript
declare global {
  interface Window {
    electronAPI: {
      startTask: (description: string) => Promise<any>;
      approveTool: (tool: any) => Promise<any>;
      getTaskStatus: () => Promise<any>;
      selectFiles: (options?: any) => Promise<any>;
      selectDirectory: () => Promise<any>;
      showMessage: (options: any) => Promise<any>;
      onTaskUpdate: (callback: (data: any) => void) => void;
      onToolRequest: (callback: (tool: any) => void) => void;
      onTaskComplete: (callback: (result: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
} 