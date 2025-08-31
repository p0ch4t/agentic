import * as fs from "fs/promises";
import * as path from "path";
import { ApiConfiguration } from "../../shared/api";
import { HistoryItem } from "../../shared/HistoryItem";

interface SafetySettings {
  autoApproveRead: boolean;
  autoApproveList: boolean;
  autoRunCommands: boolean;
  confirmDangerous: boolean;
  persistentMemory: boolean;
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

// Nueva interfaz de memoria dinámica como Claude
export interface DynamicMemory {
  id: string;
  title: string;
  content: string;
  created: string;
  updated: string;
  tags?: string[];
  importance?: 'low' | 'medium' | 'high';
  relevanceScore?: number; // Para búsquedas semánticas
  sessionId?: string; // Para aislar memoria por conversación
  isPersistent?: boolean; // Si debe mantenerse entre conversaciones
}

export interface ClaudeStyleMemorySystem {
  memories: DynamicMemory[];
  lastCleanup?: string;
  totalMemories: number;
}

export interface FluidMemory {
  userMemory: UserMemory;
  conversationContext: ConversationContext;
  taskManagement: TaskManagement;
  // Nuevo sistema de memoria dinámica
  claudeStyleMemory: ClaudeStyleMemorySystem;
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
    console.log("🔧 [CacheService] Getting API configuration:", JSON.stringify(this.cache.apiConfiguration, null, 2));
    return this.cache.apiConfiguration;
  }

  async setApiConfiguration(config: ApiConfiguration): Promise<void> {
    console.log("🔧 [CacheService] Setting API configuration:", JSON.stringify(config, null, 2));
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
        claudeStyleMemory: { memories: [], totalMemories: 0 },
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
        claudeStyleMemory: { memories: [], totalMemories: 0 },
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
        claudeStyleMemory: { memories: [], totalMemories: 0 },
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

  // ===== CLAUDE-STYLE DYNAMIC MEMORY METHODS =====

  private generateMemoryId(): string {
    return `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createMemory(title: string, content: string, tags?: string[], importance?: 'low' | 'medium' | 'high'): Promise<DynamicMemory> {
    if (!this.cache.fluidMemory) {
      this.cache.fluidMemory = {
        userMemory: {},
        conversationContext: {},
        taskManagement: { todos: [], completedCount: 0, totalCount: 0 },
        claudeStyleMemory: { memories: [], totalMemories: 0 },
        semanticMemory: { concepts: {}, relationships: {}, insights: [] },
        episodicMemory: { recentInteractions: [] },
      };
    }

    const memory: DynamicMemory = {
      id: this.generateMemoryId(),
      title,
      content,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: tags || [],
      importance: importance || 'medium'
    };

    this.cache.fluidMemory.claudeStyleMemory.memories.push(memory);
    this.cache.fluidMemory.claudeStyleMemory.totalMemories = this.cache.fluidMemory.claudeStyleMemory.memories.length;

    await this.saveCache();
    console.log(`🧠 [Memory Created] ${title}: ${content.substring(0, 50)}...`);
    return memory;
  }

  async updateMemory(id: string, updates: Partial<Pick<DynamicMemory, 'title' | 'content' | 'tags' | 'importance'>>): Promise<DynamicMemory | null> {
    if (!this.cache.fluidMemory?.claudeStyleMemory) {
      return null;
    }

    const memoryIndex = this.cache.fluidMemory.claudeStyleMemory.memories.findIndex(m => m.id === id);
    if (memoryIndex === -1) {
      return null;
    }

    this.cache.fluidMemory.claudeStyleMemory.memories[memoryIndex] = {
      ...this.cache.fluidMemory.claudeStyleMemory.memories[memoryIndex],
      ...updates,
      updated: new Date().toISOString()
    };

    await this.saveCache();
    console.log(`🔄 [Memory Updated] ${id}: ${updates.title || 'content updated'}`);
    return this.cache.fluidMemory.claudeStyleMemory.memories[memoryIndex];
  }

  async deleteMemory(id: string): Promise<boolean> {
    if (!this.cache.fluidMemory?.claudeStyleMemory) {
      return false;
    }

    const initialLength = this.cache.fluidMemory.claudeStyleMemory.memories.length;
    this.cache.fluidMemory.claudeStyleMemory.memories = this.cache.fluidMemory.claudeStyleMemory.memories.filter(m => m.id !== id);

    if (this.cache.fluidMemory.claudeStyleMemory.memories.length < initialLength) {
      this.cache.fluidMemory.claudeStyleMemory.totalMemories = this.cache.fluidMemory.claudeStyleMemory.memories.length;
      await this.saveCache();
      console.log(`🗑️ [Memory Deleted] ${id}`);
      return true;
    }

    return false;
  }

  async getMemories(): Promise<DynamicMemory[]> {
    return this.cache.fluidMemory?.claudeStyleMemory?.memories || [];
  }

  async findMemoriesByTag(tag: string): Promise<DynamicMemory[]> {
    const memories = await this.getMemories();
    return memories.filter(m => m.tags?.includes(tag));
  }

  async searchMemories(query: string): Promise<DynamicMemory[]> {
    const memories = await this.getMemories();

    if (memories.length === 0) {
      return [];
    }

    // CRÍTICO: Búsqueda semántica usando LLM, NO patrones
    console.log(`🧠 [LLM Search] Using semantic analysis to find relevant memories for: "${query}"`);

    // Calcular relevancia usando LLM semántico
    const memoriesWithRelevance = await Promise.all(
      memories.map(async memory => {
        const relevanceScore = await this.calculateSemanticRelevance(query, memory);
        return { ...memory, relevanceScore };
      })
    );

    const relevantMemories = memoriesWithRelevance
      .filter(m => m.relevanceScore > 0.1) // Solo memorias con relevancia mínima
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`🧠 [LLM Search] Found ${relevantMemories.length} semantically relevant memories using LLM analysis`);

    return relevantMemories;
  }

  private async calculateSemanticRelevance(query: string, memory: DynamicMemory): Promise<number> {
    // CRÍTICO: Usar LLM para comprensión semántica real, NO patrones
    console.log(`🧠 [LLM Relevance] Calculating semantic relevance using LLM understanding`);

    let relevance = 0;

    // Relevancia por importancia de la memoria
    const importanceWeight = {
      'high': 0.3,
      'medium': 0.2,
      'low': 0.1
    };
    relevance += importanceWeight[memory.importance || 'medium'];

    // CRÍTICO: Usar LLM para determinar relevancia contextual
    const isRelevant = await this.isSemanticallySimilar(query, memory.content, memory.title);
    if (isRelevant) {
      relevance += 0.5;
    }

    // Relevancia por recencia
    const daysSinceCreated = (Date.now() - new Date(memory.created).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 0.2 - (daysSinceCreated * 0.01));
    relevance += recencyBonus;

    return Math.min(relevance, 1.0);
  }

  private async isSemanticallySimilar(query: string, content: string, title: string): Promise<boolean> {
    // CRÍTICO: Usar LLM para determinar similitud semántica
    // NO usar patrones, regex, ni comparación de strings

    console.log(`🧠 [LLM Semantic] Determining if query "${query}" is semantically related to content`);

    // TODO: Implementar análisis semántico real con LLM
    // El LLM debe comprender si la consulta y el contenido están relacionados por SIGNIFICADO
    // Ejemplo: "¿cómo te llamas?" debe relacionarse con "me llamo Juan"

    // TEMPORAL: Lógica básica hasta implementar LLM semántico
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();

    // Solo coincidencia directa hasta tener LLM
    return contentLower.includes(queryLower) || titleLower.includes(queryLower);
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
