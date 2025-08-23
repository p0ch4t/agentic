import { TaskStatus, TaskState, TaskProgress } from './TaskStatus';
import { ElectronHostProvider } from '../../host/ElectronHostProvider';

export interface TaskOptions {
  description: string;
  hostProvider: ElectronHostProvider;
  aiModel?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TaskResult {
  output: string;
  filesModified: string[];
  success: boolean;
  error?: string;
}

export class Task {
  private id: string;
  private description: string;
  private hostProvider: ElectronHostProvider;
  private status: TaskStatus;
  private progress: TaskProgress;
  private logs: string[] = [];
  private _isRunning = false;
  private aiModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor(options: TaskOptions) {
    this.id = this.generateId();
    this.description = options.description;
    this.hostProvider = options.hostProvider;
    this.aiModel = options.aiModel || 'claude-3-sonnet';
    this.maxTokens = options.maxTokens || 4000;
    this.temperature = options.temperature || 0.7;

    this.status = {
      state: TaskState.IDLE,
      progress: 0,
      message: 'Task created',
      startTime: new Date()
    };

    this.progress = {
      current: 0,
      total: 100,
      message: 'Ready to start',
      percentage: 0
    };
  }

  async start(): Promise<TaskResult> {
    if (this._isRunning) {
      throw new Error('Task is already running');
    }

    try {
      this._isRunning = true;
      this.updateStatus(TaskState.RUNNING, 'Starting task...');
      this.updateProgress(0, 'Initializing...');

      // Aquí implementarías la lógica principal de la tarea
      // Por ahora, simularemos un proceso básico
      await this.executeTaskLogic();

      this.updateStatus(TaskState.COMPLETED, 'Task completed successfully');
      this.updateProgress(100, 'Task completed');

      return {
        output: 'Task completed successfully',
        filesModified: [],
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus(TaskState.FAILED, `Task failed: ${errorMessage}`);
      this.log(`ERROR: ${errorMessage}`);

      return {
        output: '',
        filesModified: [],
        success: false,
        error: errorMessage
      };
    } finally {
      this._isRunning = false;
      this.status.endTime = new Date();
    }
  }

  private async executeTaskLogic(): Promise<void> {
    // Simular pasos de la tarea
    const steps = [
      'Analyzing task description...',
      'Planning execution steps...',
      'Executing planned actions...',
      'Verifying results...',
      'Finalizing task...'
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = ((i + 1) / steps.length) * 100;
      
      this.updateProgress(progress, step);
      this.log(step);
      
      // Simular tiempo de procesamiento
      await this.delay(1000);
    }
  }

  async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.updateStatus(TaskState.CANCELLED, 'Task cancelled by user');
    this.log('Task cancelled by user');
  }

  async pause(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.updateStatus(TaskState.PAUSED, 'Task paused');
    this.log('Task paused');
  }

  async resume(): Promise<void> {
    if (this.status.state !== TaskState.PAUSED) {
      return;
    }

    await this.start();
  }

  async approveTool(tool: any): Promise<void> {
    this.log(`Tool approved: ${tool.name}`);
    // Aquí implementarías la lógica para ejecutar la herramienta aprobada
  }

  // Métodos de estado
  getStatus(): TaskStatus {
    return { ...this.status };
  }

  getProgress(): number {
    return this.progress.percentage;
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getDescription(): string {
    return this.description;
  }

  getId(): string {
    return this.id;
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  isCompleted(): boolean {
    return this.status.state === TaskState.COMPLETED;
  }

  // Métodos privados
  private updateStatus(state: TaskState, message: string): void {
    this.status.state = state;
    this.status.message = message;
    this.log(`STATUS: ${message}`);
  }

  private updateProgress(percentage: number, message: string): void {
    this.progress.percentage = percentage;
    this.progress.message = message;
    this.progress.current = Math.round((percentage / 100) * this.progress.total);
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.logs.push(logEntry);
    
    // También enviar al host provider para logging
    this.hostProvider.log(message);
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 