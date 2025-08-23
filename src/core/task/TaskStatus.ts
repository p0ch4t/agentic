export enum TaskState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface TaskStatus {
  state: TaskState;
  progress: number;
  message: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface TaskProgress {
  current: number;
  total: number;
  message: string;
  percentage: number;
} 