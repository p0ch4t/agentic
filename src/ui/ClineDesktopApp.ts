import { ElectronHostProvider } from '../host/ElectronHostProvider';
import { Task } from '../core/task/Task';
import { TaskStatus } from '../core/task/TaskStatus';

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  filesModified?: string[];
}

export class ClineDesktopApp {
  private hostProvider: ElectronHostProvider | null = null;
  private currentTask: Task | null = null;
  private isInitialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      // Aquí podrías inicializar configuraciones, cargar modelos de IA, etc.
      this.isInitialized = true;
      console.log('Cline Desktop App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cline Desktop App:', error);
      throw error;
    }
  }

  setHostProvider(hostProvider: ElectronHostProvider): void {
    this.hostProvider = hostProvider;
  }

  async startTask(description: string): Promise<TaskResult> {
    if (!this.hostProvider) {
      throw new Error('Host provider not set');
    }

    if (!this.isInitialized) {
      throw new Error('App not initialized');
    }

    try {
      // Crear una nueva tarea
      this.currentTask = new Task({
        description,
        hostProvider: this.hostProvider,
        // Aquí configurarías el modelo de IA y otras opciones
      });

      // Iniciar la tarea
      const result = await this.currentTask.start();

      return {
        success: true,
        output: result.output,
        filesModified: result.filesModified
      };

    } catch (error) {
      console.error('Error starting task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async approveToolExecution(tool: any): Promise<boolean> {
    if (!this.hostProvider) {
      return false;
    }

    try {
      // Mostrar solicitud de aprobación al usuario
      const approved = await this.hostProvider.showToolApproval(tool);
      
      if (approved && this.currentTask) {
        // Continuar con la ejecución de la herramienta
        await this.currentTask.approveTool(tool);
      }

      return approved;
    } catch (error) {
      console.error('Error approving tool execution:', error);
      return false;
    }
  }

  async getTaskStatus(): Promise<TaskStatus | null> {
    if (!this.currentTask) {
      return null;
    }

    return this.currentTask.getStatus();
  }

  async stopCurrentTask(): Promise<void> {
    if (this.currentTask) {
      await this.currentTask.stop();
      this.currentTask = null;
    }
  }

  async getCurrentTaskDescription(): Promise<string | null> {
    if (!this.currentTask) {
      return null;
    }

    return this.currentTask.getDescription();
  }

  async getTaskProgress(): Promise<number> {
    if (!this.currentTask) {
      return 0;
    }

    return this.currentTask.getProgress();
  }

  async getTaskLogs(): Promise<string[]> {
    if (!this.currentTask) {
      return [];
    }

    return this.currentTask.getLogs();
  }

  // Métodos para gestión de archivos
  async readFile(filePath: string): Promise<string> {
    if (!this.hostProvider) {
      throw new Error('Host provider not set');
    }

    return await this.hostProvider.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.hostProvider) {
      throw new Error('Host provider not set');
    }

    await this.hostProvider.writeFile(filePath, content);
  }

  async listFiles(directory: string): Promise<string[]> {
    if (!this.hostProvider) {
      throw new Error('Host provider not set');
    }

    return await this.hostProvider.listFiles(directory);
  }

  // Métodos para ejecución de comandos
  async executeCommand(command: string, cwd?: string): Promise<any> {
    if (!this.hostProvider) {
      throw new Error('Host provider not set');
    }

    return await this.hostProvider.executeCommand(command, cwd);
  }

  // Métodos para configuración
  async getConfiguration(): Promise<any> {
    // Aquí podrías cargar configuraciones desde archivos o base de datos
    return {
      aiModel: 'claude-3-sonnet',
      apiKey: process.env.CLINE_API_KEY || '',
      autoApprove: false,
      maxTokens: 4000,
      temperature: 0.7
    };
  }

  async updateConfiguration(config: any): Promise<void> {
    // Aquí podrías guardar configuraciones
    console.log('Configuration updated:', config);
  }

  // Métodos para gestión de historial
  async getTaskHistory(): Promise<any[]> {
    // Aquí podrías cargar historial de tareas desde almacenamiento
    return [];
  }

  async saveTaskToHistory(task: any): Promise<void> {
    // Aquí podrías guardar tareas en el historial
    console.log('Task saved to history:', task);
  }

  // Métodos para limpieza
  async cleanup(): Promise<void> {
    try {
      await this.stopCurrentTask();
      
      if (this.hostProvider) {
        this.hostProvider.dispose();
        this.hostProvider = null;
      }

      this.isInitialized = false;
      console.log('Cline Desktop App cleaned up successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Métodos para estado de la aplicación
  isTaskRunning(): boolean {
    return this.currentTask !== null && this.currentTask.isRunning();
  }

  isTaskCompleted(): boolean {
    return this.currentTask !== null && this.currentTask.isCompleted();
  }

  getCurrentTaskId(): string | null {
    return this.currentTask?.getId() || null;
  }

  // Métodos para debugging
  async debugTask(): Promise<any> {
    if (!this.currentTask) {
      return { error: 'No task running' };
    }

    return {
      taskId: this.currentTask.getId(),
      status: this.currentTask.getStatus(),
      progress: this.currentTask.getProgress(),
      logs: this.currentTask.getLogs(),
      description: this.currentTask.getDescription()
    };
  }
} 