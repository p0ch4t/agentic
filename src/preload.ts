import { contextBridge, ipcRenderer } from "electron";

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Tareas del agente (legacy)
  startTask: (description: string) =>
    ipcRenderer.invoke("start-task", description),
  approveTool: (tool: any) => ipcRenderer.invoke("approve-tool", tool),
  getTaskStatus: () => ipcRenderer.invoke("get-task-status"),

  // ===== NUEVAS APIs PARA IA CONVERSACIONAL =====

  // Conversación con IA
  sendAIMessage: (message: string) =>
    ipcRenderer.invoke("send-ai-message", message),
  getConversationHistory: () => ipcRenderer.invoke("get-conversation-history"),
  clearConversation: () => ipcRenderer.invoke("clear-conversation"),
  isAIProcessing: () => ipcRenderer.invoke("is-ai-processing"),

  // Gestión de herramientas
  approveToolCall: (toolCallId: string) =>
    ipcRenderer.invoke("approve-tool", toolCallId),
  rejectTool: (toolCallId: string) =>
    ipcRenderer.invoke("reject-tool", toolCallId),
  getPendingTools: () => ipcRenderer.invoke("get-pending-tools"),

  // Configuración de IA
  updateAIConfig: (config: any) =>
    ipcRenderer.invoke("update-ai-config", config),
  getAIConfig: () => ipcRenderer.invoke("get-ai-config"),

  // Selección de archivos
  selectFiles: (options?: any) => ipcRenderer.invoke("select-files", options),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),

  // Mensajes del sistema
  showMessage: (options: any) => ipcRenderer.invoke("show-message", options),

  // Eventos del sistema
  onTaskUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on("task-update", (event, data) => callback(data));
  },

  onToolRequest: (callback: (tool: any) => void) => {
    ipcRenderer.on("tool-request", (event, tool) => callback(tool));
  },

  onTaskComplete: (callback: (result: any) => void) => {
    ipcRenderer.on("task-complete", (event, result) => callback(result));
  },

  onAIResponse: (callback: (response: any) => void) => {
    ipcRenderer.on("ai-response", (event, response) => callback(response));
  },

  onToolCallRequest: (callback: (toolCall: any) => void) => {
    ipcRenderer.on("tool-call-request", (event, toolCall) =>
      callback(toolCall),
    );
  },

  // Command Output Streaming
  onCommandOutput: (callback: (data: any) => void) => {
    ipcRenderer.on("command-output", (event, data) => callback(data));
  },
  onClineMessage: (callback: (message: any) => void) => {
    ipcRenderer.on("cline-message", (event, message) => callback(message));
  },

  // Limpiar listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Tipos para TypeScript
declare global {
  interface Window {
    electronAPI: {
      // Legacy APIs
      startTask: (description: string) => Promise<any>;
      getTaskStatus: () => Promise<any>;

      // AI Conversational APIs
      sendAIMessage: (message: string) => Promise<any>;
      getConversationHistory: () => Promise<any>;
      clearConversation: () => Promise<any>;
      isAIProcessing: () => Promise<boolean>;

      // Tool Management APIs
      approveToolCall: (toolCallId: string) => Promise<any>;
      rejectTool: (toolCallId: string) => Promise<any>;
      getPendingTools: () => Promise<any>;

      // AI Configuration APIs
      updateAIConfig: (config: any) => Promise<any>;
      getAIConfig: () => Promise<any>;

      // File System APIs
      selectFiles: (options?: any) => Promise<any>;
      selectDirectory: () => Promise<any>;

      // System APIs
      showMessage: (options: any) => Promise<any>;

      // Event Listeners
      onTaskUpdate: (callback: (data: any) => void) => void;
      onToolRequest: (callback: (tool: any) => void) => void;
      onTaskComplete: (callback: (result: any) => void) => void;
      onAIResponse: (callback: (response: any) => void) => void;
      onToolCallRequest: (callback: (toolCall: any) => void) => void;
      onCommandOutput: (callback: (data: any) => void) => void;
      onClineMessage: (callback: (message: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
