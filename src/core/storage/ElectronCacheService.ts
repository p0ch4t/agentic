import * as fs from "fs/promises";
import * as path from "path";
import { ApiConfiguration } from "../../shared/api";
import { HistoryItem } from "../../shared/HistoryItem";

interface SafetySettings {
  autoApproveRead: boolean;
  autoApproveList: boolean;
  confirmDangerous: boolean;
}

export interface UserMemory {
  name?: string;
  systemUsername?: string;
  homeDirectory?: string;
  currentDirectory?: string;
  lastAccessedUrl?: string;
  lastAccessedDomain?: string;
  preferences?: Record<string, any>;
  personalInfo?: Record<string, any>;
  lastUpdated?: string;
}

export interface ConversationContext {
  currentProject?: string;
  workingDirectory?: string;
  recentFiles?: string[];
  activeTask?: string;
  userGoals?: string[];
  conversationTheme?: string;
  technicalContext?: {
    languages?: string[];
    frameworks?: string[];
    tools?: string[];
  };
  problemContext?: {
    currentIssue?: string;
    attemptedSolutions?: string[];
    workingApproach?: string;
  };
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high";
  created?: string;
  updated?: string;
  dependencies?: string[];
  estimatedTime?: string;
}

export interface TaskManagement {
  todos: TodoItem[];
  activeTaskId?: string;
  completedCount: number;
  totalCount: number;
}

export interface FluidMemory {
  userMemory: UserMemory;
  conversationContext: ConversationContext;
  taskManagement: TaskManagement;
  semanticMemory: {
    concepts: Record<string, any>;
    relationships: Record<string, string[]>;
    insights: string[];
  };
  episodicMemory: {
    recentInteractions: Array<{
      timestamp: string;
      summary: string;
      outcome: string;
      learned: string[];
    }>;
  };
}

export interface CacheData {
  apiConfiguration?: ApiConfiguration;
  taskHistory?: HistoryItem[];
  globalState?: Record<string, any>;
  secrets?: Record<string, string>;
  safetySettings?: SafetySettings;
  userMemory?: UserMemory;
  fluidMemory?: FluidMemory;
}

/**
 * Electron adaptation of the official Cline CacheService
 * Handles persistent storage for the Electron app
 */
export class ElectronCacheService {
  private storageDir: string;
  private cacheFile: string;
  private cache: CacheData = {};
  private isInitialized = false;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.cacheFile = path.join(storageDir, "cache.json");
  }

  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true });

      // Load existing cache
      await this.loadCache();

      this.isInitialized = true;
      console.log("ElectronCacheService initialized");
    } catch (error) {
      console.error("Failed to initialize ElectronCacheService:", error);
      throw error;
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFile, "utf-8");
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty cache
      this.cache = {};
    }
  }

  private async saveCache(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const data = JSON.stringify(this.cache, null, 2);
      await fs.writeFile(this.cacheFile, data, "utf-8");
    } catch (error) {
      console.error("Failed to save cache:", error);
      throw error;
    }
  }

  // ===== API CONFIGURATION =====

  async getApiConfiguration(): Promise<ApiConfiguration | undefined> {
    return this.cache.apiConfiguration;
  }

  async setApiConfiguration(config: ApiConfiguration): Promise<void> {
    this.cache.apiConfiguration = config;
    await this.saveCache();
  }

  // ===== SAFETY SETTINGS =====

  async getSafetySettings(): Promise<SafetySettings | undefined> {
    return this.cache.safetySettings;
  }

  async setSafetySettings(settings: SafetySettings): Promise<void> {
    this.cache.safetySettings = settings;
    await this.saveCache();
  }

  // Fluid Memory Management (like Claude's contextual memory)
  async getFluidMemory(): Promise<FluidMemory | undefined> {
    return this.cache.fluidMemory;
  }

  async setFluidMemory(memory: FluidMemory): Promise<void> {
    this.cache.fluidMemory = memory;
    await this.saveCache();
  }

  async updateConversationContext(
    context: Partial<ConversationContext>,
  ): Promise<void> {
    if (!this.cache.fluidMemory) {
      this.cache.fluidMemory = {
        userMemory: {},
        conversationContext: {},
        taskManagement: { todos: [], completedCount: 0, totalCount: 0 },
        semanticMemory: { concepts: {}, relationships: {}, insights: [] },
        episodicMemory: { recentInteractions: [] },
      };
    }

    this.cache.fluidMemory.conversationContext = {
      ...this.cache.fluidMemory.conversationContext,
      ...context,
    };

    await this.saveCache();
  }

  async addSemanticConcept(concept: string, data: any): Promise<void> {
    if (!this.cache.fluidMemory) {
      this.cache.fluidMemory = {
        userMemory: {},
        conversationContext: {},
        taskManagement: { todos: [], completedCount: 0, totalCount: 0 },
        semanticMemory: { concepts: {}, relationships: {}, insights: [] },
        episodicMemory: { recentInteractions: [] },
      };
    }

    this.cache.fluidMemory.semanticMemory.concepts[concept] = data;
    await this.saveCache();
  }

  async addEpisodicMemory(interaction: {
    timestamp: string;
    summary: string;
    outcome: string;
    learned: string[];
  }): Promise<void> {
    if (!this.cache.fluidMemory) {
      this.cache.fluidMemory = {
        userMemory: {},
        conversationContext: {},
        taskManagement: { todos: [], completedCount: 0, totalCount: 0 },
        semanticMemory: { concepts: {}, relationships: {}, insights: [] },
        episodicMemory: { recentInteractions: [] },
      };
    }

    this.cache.fluidMemory.episodicMemory.recentInteractions.unshift(
      interaction,
    );

    // Keep only last 50 interactions
    if (this.cache.fluidMemory.episodicMemory.recentInteractions.length > 50) {
      this.cache.fluidMemory.episodicMemory.recentInteractions =
        this.cache.fluidMemory.episodicMemory.recentInteractions.slice(0, 50);
    }

    await this.saveCache();
  }

  // ===== TASK HISTORY =====

  async getTaskHistory(): Promise<HistoryItem[] | undefined> {
    return this.cache.taskHistory;
  }

  async setTaskHistory(history: HistoryItem[]): Promise<void> {
    this.cache.taskHistory = history;
    await this.saveCache();
  }

  // ===== GLOBAL STATE =====

  async getGlobalState<T>(key: string): Promise<T | undefined> {
    return this.cache.globalState?.[key] as T;
  }

  async setGlobalState<T>(key: string, value: T): Promise<void> {
    if (!this.cache.globalState) {
      this.cache.globalState = {};
    }
    this.cache.globalState[key] = value;
    await this.saveCache();
  }

  // ===== SECRETS =====

  async getSecret(key: string): Promise<string | undefined> {
    return this.cache.secrets?.[key];
  }

  async setSecret(key: string, value: string | undefined): Promise<void> {
    if (!this.cache.secrets) {
      this.cache.secrets = {};
    }

    if (value === undefined) {
      delete this.cache.secrets[key];
    } else {
      this.cache.secrets[key] = value;
    }

    await this.saveCache();
  }

  // ===== USER MEMORY =====

  async getUserMemory(): Promise<UserMemory | undefined> {
    return this.cache.userMemory;
  }

  async setUserMemory(memory: UserMemory): Promise<void> {
    this.cache.userMemory = {
      ...memory,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveCache();
  }

  async updateUserMemory(updates: Partial<UserMemory>): Promise<void> {
    const currentMemory = this.cache.userMemory || {};
    this.cache.userMemory = {
      ...currentMemory,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveCache();
  }

  async setUserName(name: string): Promise<void> {
    await this.updateUserMemory({ name });
  }

  async getUserName(): Promise<string | undefined> {
    return this.cache.userMemory?.name;
  }

  // ===== UTILITY METHODS =====

  async clear(): Promise<void> {
    this.cache = {};
    await this.saveCache();
  }

  async reInitialize(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }

  // ===== COMPATIBILITY METHODS (for official Cline compatibility) =====

  getGlobalStateKey<T>(key: string): T | undefined {
    return this.cache.globalState?.[key] as T;
  }

  setGlobalStateKey<T>(key: string, value: T): void {
    if (!this.cache.globalState) {
      this.cache.globalState = {};
    }
    this.cache.globalState[key] = value;
    this.saveCache().catch(console.error);
  }

  // ===== TASK MANAGEMENT METHODS =====

  async getTodos(): Promise<TodoItem[]> {
    const fluidMemory = await this.getFluidMemory();
    return fluidMemory?.taskManagement?.todos || [];
  }

  async addTodo(
    todo: Omit<TodoItem, "id" | "created" | "updated">,
  ): Promise<TodoItem> {
    const fluidMemory = await this.getFluidMemory();
    if (!fluidMemory) {
      throw new Error("Failed to initialize fluid memory");
    }

    const newTodo: TodoItem = {
      ...todo,
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    if (!fluidMemory.taskManagement) {
      fluidMemory.taskManagement = {
        todos: [],
        completedCount: 0,
        totalCount: 0,
      };
    }

    fluidMemory.taskManagement.todos.push(newTodo);
    fluidMemory.taskManagement.totalCount =
      fluidMemory.taskManagement.todos.length;
    fluidMemory.taskManagement.completedCount =
      fluidMemory.taskManagement.todos.filter(
        (t) => t.status === "completed",
      ).length;

    await this.setFluidMemory(fluidMemory);
    return newTodo;
  }

  async updateTodo(
    id: string,
    updates: Partial<TodoItem>,
  ): Promise<TodoItem | null> {
    const fluidMemory = await this.getFluidMemory();
    if (!fluidMemory?.taskManagement) {
      return null;
    }

    const todoIndex = fluidMemory.taskManagement.todos.findIndex(
      (t) => t.id === id,
    );
    if (todoIndex === -1) {
      return null;
    }

    fluidMemory.taskManagement.todos[todoIndex] = {
      ...fluidMemory.taskManagement.todos[todoIndex],
      ...updates,
      updated: new Date().toISOString(),
    };

    fluidMemory.taskManagement.completedCount =
      fluidMemory.taskManagement.todos.filter(
        (t) => t.status === "completed",
      ).length;

    await this.setFluidMemory(fluidMemory);
    return fluidMemory.taskManagement.todos[todoIndex];
  }

  async deleteTodo(id: string): Promise<boolean> {
    const fluidMemory = await this.getFluidMemory();
    if (!fluidMemory?.taskManagement) {
      return false;
    }

    const initialLength = fluidMemory.taskManagement.todos.length;
    fluidMemory.taskManagement.todos = fluidMemory.taskManagement.todos.filter(
      (t) => t.id !== id,
    );

    if (fluidMemory.taskManagement.todos.length < initialLength) {
      fluidMemory.taskManagement.totalCount =
        fluidMemory.taskManagement.todos.length;
      fluidMemory.taskManagement.completedCount =
        fluidMemory.taskManagement.todos.filter(
          (t) => t.status === "completed",
        ).length;
      await this.setFluidMemory(fluidMemory);
      return true;
    }

    return false;
  }
}
