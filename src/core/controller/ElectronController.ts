import { BrowserWindow } from "electron";
import { buildApiHandler } from "../api";
import { ModelInfo } from "../../shared/api";
import { ExtensionState, Platform } from "../../shared/ExtensionMessage";
import { ClineMessage } from "../../shared/ClineMessage";
import { Mode } from "../../shared/storage/types";
import { HistoryItem } from "../../shared/HistoryItem";
import { Task } from "../task/ElectronTask";
import { ElectronHostProvider } from "../../host/ElectronHostProvider";
import { ElectronCacheService } from "../storage/ElectronCacheService";
import {
  SelfReflectiveAIAgent,
  AIConfiguration,
} from "../ai/SelfReflectiveAIAgent";
import { ConfigurationManager } from "../config/ConfigurationManager";
import { FrontendConfiguration } from "../../shared/FrontendConfiguration";
import { ConfigurationLogger } from "../config/ConfigurationLogger";

export interface ElectronControllerOptions {
  mainWindow: BrowserWindow;
  storageDir: string;
}

/**
 * Electron adaptation of the official Cline Controller
 * Manages tasks, API configuration, and state for the Electron app
 */
export class ElectronController {
  readonly id: string;
  private mainWindow: BrowserWindow;
  private hostProvider: ElectronHostProvider;
  private cacheService: ElectronCacheService;
  private selfReflectiveAI?: SelfReflectiveAIAgent;
  private conversationContext: Map<string, any> = new Map();
  private lastUserInteraction: number = 0;
  private sessionStartTime: number = Date.now();

  task?: Task;

  // Continuous reasoning control
  public stopContinuousReasoning(): void {
    if (this.task) {
      this.task.stopContinuousReasoning();
    }
  }

  public isContinuousReasoningActive(): boolean {
    return this.task?.isContinuousReasoningActive() || false;
  }

  constructor(options: ElectronControllerOptions) {
    this.id = `electron-controller-${Date.now()}`;
    this.mainWindow = options.mainWindow;
    this.hostProvider = new ElectronHostProvider(this.mainWindow);
    this.cacheService = new ElectronCacheService(options.storageDir);

    console.log("ElectronController instantiated");
  }

  async initialize(): Promise<void> {
    try {
      await this.cacheService.initialize();

      // Ensure we have a default configuration to prevent "undefined provider" errors
      const existingConfig = await this.getApiConfiguration();
      console.log("🔧 [ElectronController] Existing config on initialization:", JSON.stringify(existingConfig, null, 2));

      // Only set default config if no config exists at all
      if (!existingConfig) {
        // Load default configuration from JSON file
        let defaultConfig;
        try {
          const fs = require("fs");
          const path = require("path");
          const configPath = path.join(
            __dirname,
            "../../../config/default-api-config.json",
          );
          const configData = fs.readFileSync(configPath, "utf8");
          defaultConfig = JSON.parse(configData);
          console.log("Loaded default configuration from config file");
        } catch (error) {
          console.warn(
            "Could not load config file, using fallback configuration:",
            error,
          );
          // Fallback configuration if file doesn't exist
          defaultConfig = {
            apiModelId: "gemini-2.5-pro",
            temperature: 0.7,
            maxTokens: 4096,
            planModeApiProvider: "genai" as const,
            actModeApiProvider: "genai" as const,
            actModeApiModelId: "gemini-2.5-pro",
            planModeApiModelId: "gemini-2.5-pro",
            genAiApiKey: "", // User needs to set this
            genAiBaseUrl: "",
          };
        }

        await this.cacheService.setApiConfiguration(defaultConfig);
        console.log(
          "Default API configuration set - User needs to configure API key",
        );
      }

      // Inicializar SelfReflectiveAIAgent
      await this.initializeSelfReflectiveAI();

      // Enviar estado inicial al renderer
      await this.postStateToRenderer();

      console.log("ElectronController initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ElectronController:", error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Obtiene la última respuesta del task para análisis
   */
  private getLastTaskResponse(): string {
    if (!this.task || !this.task.clineMessages) {
      return "";
    }

    // Buscar el último mensaje del asistente (tipo "say")
    const assistantMessages = this.task.clineMessages
      .filter((msg) => msg.type === "say" && msg.text)
      .reverse(); // Más reciente primero

    if (assistantMessages.length > 0) {
      return assistantMessages[0].text || "";
    }

    return "";
  }

  /**
   * Muestra el razonamiento al usuario sobre por qué el comando falló
   */
  private async showReasoningToUser(
    analysis: any,
    originalRequest: string,
    failedResponse: string,
  ): Promise<void> {
    const reasoningPrompt = `Error occurred. Explain what happened and how you'll fix it:

Request: ${originalRequest}
Error: ${failedResponse}

Explica tu razonamiento de forma clara y menciona que vas a buscar una alternativa.`;

    const reasoningMessage = {
      ts: Date.now(),
      type: "ask" as const,
      ask: "followup" as const,
      text: reasoningPrompt,
    };

    if (this.task) {
      this.task.clineMessages.push(reasoningMessage);
      await this.task.execute();
    }
  }

  /**
   * Ejecuta una corrección inteligente como un agente de IA
   */
  private async executeIntelligentCorrection(
    analysis: any,
    originalRequest: string,
    failedResponse: string,
    attemptCount: number = 1,
  ): Promise<void> {
    const maxAttempts = 5; // Límite de seguridad

    if (attemptCount > maxAttempts) {
      console.log(
        "🛑 [ElectronController] Max attempts reached, stopping correction loop",
      );
      return;
    }

    console.log(
      `🔄 [ElectronController] Correction attempt ${attemptCount}/${maxAttempts}`,
    );

    // Obtener historial reciente para que el AI analice qué ya se intentó
    const conversationHistory = this.getRecentConversationHistory();

    const correctionPrompt = `Command failed. Attempt ${attemptCount}/${maxAttempts}.

Goal: ${originalRequest}
Error: ${failedResponse}
Context: ${conversationHistory}

Tasks:
1. Analyze what commands already failed and why
2. Identify OS from error syntax
3. Try correct syntax for different OS if needed
4. Find completely different command if syntax fixes don't work
5. Execute the correct solution immediately

Critical: Don't repeat the exact same failed commands.`;

    const correctionMessage = {
      ts: Date.now(),
      type: "ask" as const,
      ask: "followup" as const,
      text: correctionPrompt,
    };

    if (this.task) {
      this.task.clineMessages.push(correctionMessage);
      await this.task.execute();

      // Obtener la respuesta del AI para logging
      const aiResponse = this.getLastTaskResponse();
      console.log(
        `📝 [ElectronController] AI Response (attempt ${attemptCount}):`,
        aiResponse.substring(0, 200) + "...",
      );

      // Evaluar si la respuesta fue exitosa
      const wasSuccessful = await this.evaluateSuccess(originalRequest);
      console.log(
        `🔍 [ElectronController] Success evaluation result:`,
        wasSuccessful,
      );

      if (!wasSuccessful) {
        console.log(
          "🔄 [ElectronController] Response not satisfactory, trying again...",
        );

        // Mostrar mensaje amigable al usuario
        const searchingMessage = {
          ts: Date.now(),
          type: "say" as const,
          say: "text" as const,
          text: "🔍 Buscando una respuesta que funcione...",
        };

        this.task.clineMessages.push(searchingMessage);
        this.hostProvider.sendToRenderer("cline-message", searchingMessage);

        // Continuar con el siguiente intento
        await this.executeIntelligentCorrection(
          analysis,
          originalRequest,
          failedResponse,
          attemptCount + 1,
        );
      } else {
        console.log(
          "✅ [ElectronController] Success achieved, stopping correction loop",
        );
      }
    }
  }

  /**
   * Obtiene el historial reciente de la conversación para que el AI analice qué ya se intentó
   */
  private getRecentConversationHistory(): string {
    if (!this.task || !this.task.clineMessages) {
      return "";
    }

    const messages = this.task.clineMessages;
    const recentMessages = messages.slice(-10); // Últimos 10 mensajes

    return recentMessages
      .map((msg) => {
        if (msg.type === "ask") {
          return `Usuario/Sistema: ${msg.text}`;
        } else if (msg.type === "say") {
          return `AI: ${msg.text}`;
        }
        return "";
      })
      .filter((text) => text.length > 0)
      .join("\n");
  }

  private getConversationHistoryForAnalysis(): Array<{
    role: string;
    content: string;
    timestamp: number;
  }> {
    if (!this.task || !this.task.clineMessages) {
      return [];
    }

    return this.task.clineMessages
      .map((msg) => ({
        role: msg.type === "ask" ? "user" : "assistant",
        content: msg.text || "",
        timestamp: msg.ts,
      }))
      .filter((msg) => msg.content.length > 0);
  }

  private async updateDebugMetadata(metadata: {
    wasAnalyzed: boolean;
    hadError: boolean;
    correctionApplied: boolean;
    analysisDetails?: any;
  }): Promise<void> {
    // INTELLIGENT APPROACH: Let the AI understand what metadata is valuable
    // Update debug logging with semantic understanding of analysis results

    try {
      console.log('🔍 [Debug Metadata] AI analysis completed:', {
        analyzed: metadata.wasAnalyzed,
        errorDetected: metadata.hadError,
        correctionNeeded: metadata.correctionApplied,
        details: metadata.analysisDetails
      });

      // The debug logger will naturally incorporate this metadata
      // when logging conversations through the existing logConversationToDebugger method

      // Store metadata for the current task to be used in logging
      if (this.task) {
        (this.task as any).lastAnalysisMetadata = metadata;
      }
    } catch (error) {
      console.error('❌ [Debug Metadata] Error updating metadata:', error);
    }
  }

  /**
   * Evalúa si la respuesta actual satisface el objetivo original del usuario
   */
  private async evaluateSuccess(originalRequest: string): Promise<boolean> {
    const lastResponse = this.getLastTaskResponse();

    // Usar el SelfReflectiveAI para evaluar internamente sin mostrar al usuario
    if (this.selfReflectiveAI && this.task) {
      try {
        const evaluationPrompt = `Evaluate if this response fully satisfies the user's original request.

Original request: ${originalRequest}
Respuesta actual: ${lastResponse}

Responde ÚNICAMENTE con "ÉXITO" si la respuesta satisface completamente la solicitud original, o "CONTINUAR" si necesita más trabajo.`;

        // Usar el método analyzeResponse del SelfReflectiveAI para hacer la evaluación
        const analysis = await this.selfReflectiveAI.analyzeResponse(
          lastResponse,
          originalRequest,
        );

        console.log(`🔍 [ElectronController] Analysis result:`, {
          hasError: analysis.hasError,
          needsCorrection: analysis.needsCorrection,
          errorSeverity: analysis.errorSeverity,
          canAutoFix: analysis.canAutoFix,
        });

        // Si el análisis indica que no hay error, entonces fue exitoso
        return !analysis.hasError;
      } catch (error) {
        console.error(
          "❌ [ElectronController] Error in success evaluation:",
          error,
        );
        // Si hay error en la evaluación, asumir que necesita continuar
        return false;
      }
    }

    return false;
  }

  // ===== SELF-REFLECTIVE AI INITIALIZATION =====

  private async initializeSelfReflectiveAI(): Promise<void> {
    try {
      const apiConfig = await this.getApiConfiguration();

      // Crear configuración para el AIAgent (usar valores por defecto si no hay config)
      const aiConfiguration: AIConfiguration = {
        model: apiConfig?.actModeApiModelId || "o3",
        temperature: apiConfig?.temperature || 0.7,
        maxTokens: apiConfig?.maxTokens || 4096,
        apiKey: apiConfig?.genAiApiKey || "",
        baseUrl: apiConfig?.genAiBaseUrl || "",
      };

      this.selfReflectiveAI = new SelfReflectiveAIAgent(
        this.hostProvider,
        aiConfiguration,
      );
      console.log(
        "🧠 [SelfReflectiveAI] Initialized successfully (using default config if needed)",
      );
    } catch (error) {
      console.error("❌ [SelfReflectiveAI] Failed to initialize:", error);
    }
  }

  // ===== TASK MANAGEMENT =====

  async startTask(userMessage: string): Promise<void> {
    console.log(
      "🎯 [ElectronController] Starting task with message:",
      userMessage.substring(0, 100) + "...",
    );

    // Update conversation context with semantic understanding
    this.lastUserInteraction = Date.now();
    const timeSinceLastMessage =
      this.lastUserInteraction -
      (this.conversationContext.get("lastMessageTime") ||
        this.sessionStartTime);

    // If less than 5 minutes since last message, maintain context
    const shouldMaintainContext = timeSinceLastMessage < 5 * 60 * 1000; // 5 minutes

    if (this.task && !shouldMaintainContext) {
      console.log(
        "🔄 [ElectronController] Clearing old task (conversation gap detected)",
      );
      await this.clearTask();
    } else if (this.task && shouldMaintainContext) {
      console.log(
        "🔗 [ElectronController] Maintaining conversation context (continuous conversation)",
      );
      // Add the new message to existing task instead of creating new one
      this.task.clineMessages.push({
        ts: Date.now(),
        type: "ask",
        ask: "followup",
        text: userMessage,
      });

      // Update context
      this.conversationContext.set("lastMessageTime", this.lastUserInteraction);
      this.conversationContext.set(
        "messageCount",
        (this.conversationContext.get("messageCount") || 0) + 1,
      );

      console.log(
        "▶️ [ElectronController] Executing task with maintained context",
      );
      await this.task.execute();
      return;
    }

    try {
      console.log("⚙️ [ElectronController] Getting API configuration");
      // Get API configuration
      const apiConfiguration = await this.getApiConfiguration();
      if (!apiConfiguration) {
        console.error("❌ [ElectronController] API configuration not found");
        throw new Error(
          "No API configuration found. Please configure your API settings.",
        );
      }

      console.log("✅ [ElectronController] API configuration loaded:", {
        provider: apiConfiguration.actModeApiProvider,
        model: apiConfiguration.actModeApiModelId,
        hasApiKey: !!apiConfiguration.genAiApiKey,
        baseUrl: apiConfiguration.genAiBaseUrl,
      });

      // Debug: Log the configuration being used
      console.log(
        "🔍 [ElectronController] Full API Configuration:",
        JSON.stringify(apiConfiguration, null, 2),
      );
      console.log(
        "🔍 [ElectronController] Act Mode API Provider:",
        apiConfiguration.actModeApiProvider,
      );

      console.log("🔧 [ElectronController] Building API handler");
      // Build API handler
      const apiHandler = buildApiHandler(apiConfiguration, "act");
      console.log("✅ [ElectronController] API handler built successfully");

      console.log(
        "📋 [ElectronController] Creating new task with conversation context",
      );
      // Create new task
      this.task = new Task(
        this.id,
        this.hostProvider,
        apiHandler,
        this.cacheService,
        userMessage,
      );

      // Initialize conversation context
      this.conversationContext.set("lastMessageTime", this.lastUserInteraction);
      this.conversationContext.set("messageCount", 1);
      this.conversationContext.set("sessionId", this.id);

      console.log(
        "✅ [ElectronController] Task created successfully with context",
      );

      console.log("▶️ [ElectronController] Executing task");
      // Start the task
      await this.task.execute();
      console.log("✅ [ElectronController] Task execution completed");
    } catch (error) {
      console.error("❌ [ElectronController] Error starting task:", error);
      console.error("❌ [ElectronController] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        userMessage: userMessage.substring(0, 200),
      });
      throw error;
    }
  }

  async clearTask(): Promise<void> {
    if (this.task) {
      await this.task.abort();
      this.task = undefined;
    }

    // CRÍTICO: Limpiar memoria de conversación según configuración del usuario
    await this.clearConversationMemoryIfNeeded();
  }

  /**
   * Verifica la configuración del usuario y limpia la memoria si es necesario
   */
  private async clearConversationMemoryIfNeeded(): Promise<void> {
    try {
      const safetySettings = await this.cacheService.getSafetySettings();
      // TEMPORALMENTE DESHABILITADO: Memoria persistente deshabilitada por defecto
      const persistentMemory = safetySettings?.persistentMemory === true; // Por defecto false

      if (!persistentMemory) {
        console.log('🧹 [Memory] Persistent memory disabled (default), clearing conversation memory...');
        await this.clearConversationMemory();
      } else {
        console.log('🧠 [Memory] Persistent memory explicitly enabled, keeping conversation memory...');
      }
    } catch (error) {
      console.error('❌ [Memory] Error checking memory settings:', error);
      // TEMPORALMENTE DESHABILITADO: En caso de error, limpiar memoria por seguridad
      console.log('🧹 [Memory] Error occurred, clearing memory as safety measure...');
      await this.clearConversationMemory();
    }
  }

  /**
   * Limpia la memoria específica de la conversación actual
   * Mantiene solo la información persistente del usuario (nombre, preferencias básicas)
   * pero elimina el contexto de conversación y memoria episódica
   */
  private async clearConversationMemory(): Promise<void> {
    console.log('🧹 [Memory] Clearing conversation-specific memory...');

    try {
      const fluidMemory = await this.cacheService.getFluidMemory();

      if (fluidMemory) {
        // Limpiar contexto de conversación
        fluidMemory.conversationContext = {};

        // Limpiar memoria episódica (interacciones recientes)
        fluidMemory.episodicMemory.recentInteractions = [];

        // Limpiar tareas/todos de la conversación anterior
        fluidMemory.taskManagement = {
          todos: [],
          completedCount: 0,
          totalCount: 0
        };

        // CRÍTICO: Limpiar memorias dinámicas de la conversación
        // Solo mantener información básica del usuario si es realmente persistente
        fluidMemory.claudeStyleMemory.memories = [];
        fluidMemory.claudeStyleMemory.totalMemories = 0;

        // Limpiar conceptos semánticos temporales
        fluidMemory.semanticMemory.concepts = {};
        fluidMemory.semanticMemory.relationships = {};
        fluidMemory.semanticMemory.insights = [];

        await this.cacheService.setFluidMemory(fluidMemory);
        console.log('✅ [Memory] Conversation memory cleared successfully');
      }
    } catch (error) {
      console.error('❌ [Memory] Error clearing conversation memory:', error);
    }
  }

  /**
   * Método público para limpiar memoria manualmente (independiente de la configuración)
   * Útil para el botón "Clear Conversation" en la UI
   */
  async clearMemoryManually(): Promise<void> {
    console.log('🧹 [Memory] Manual memory clear requested...');
    await this.clearConversationMemory();
  }

  // ===== API CONFIGURATION =====

  async updateApiConfiguration(config: FrontendConfiguration): Promise<void> {
    try {
      // Obtener configuración anterior para logging
      const previousConfig = await this.getFullConfiguration();

      // Validar configuración antes de procesarla
      const validation = ConfigurationManager.validateConfiguration(config);
      ConfigurationLogger.logValidation(config, validation.isValid, validation.errors, validation.warnings);

      if (!validation.isValid) {
        const error = new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        ConfigurationLogger.logConfigurationError('updateApiConfiguration', error, config);
        throw error;
      }

      // Usar ConfigurationManager para mapeo centralizado
      const { apiConfig, safetySettings } = ConfigurationManager.denormalizeFromFrontend(config);

      // Guardar configuraciones
      await this.cacheService.setApiConfiguration(apiConfig);
      await this.cacheService.setSafetySettings(safetySettings);

      // Log del cambio exitoso
      ConfigurationLogger.logConfigurationChange(previousConfig, config, 'UPDATE');
      ConfigurationLogger.logConfigurationSave(config);

      // Reinicializar SelfReflectiveAI con la nueva configuración
      await this.initializeSelfReflectiveAI();

      await this.postStateToRenderer();

      console.log("API configuration updated:", apiConfig);
    } catch (error) {
      console.error("Error updating API configuration:", error);
      throw error;
    }
  }

  async getApiConfiguration(): Promise<any> {
    const config = await this.cacheService.getApiConfiguration();

    // Siempre enviar actualización de estado al renderer cuando se obtiene la configuración
    // Esto incluye casos donde no hay API key (como configuraciones "custom")
    console.log("🔄 [ElectronController] Sending state update after getting API configuration");
    await this.postStateToRenderer();

    return config;
  }

  async getFullConfiguration(): Promise<FrontendConfiguration> {
    try {
      const apiConfig = await this.cacheService.getApiConfiguration();
      const safetySettings = await this.cacheService.getSafetySettings();

      // Usar ConfigurationManager para mapeo centralizado y tipado
      const config = ConfigurationManager.normalizeForFrontend(apiConfig, safetySettings);

      // Log de carga de configuración
      ConfigurationLogger.logConfigurationLoad(config);

      return config;
    } catch (error) {
      ConfigurationLogger.logConfigurationError('getFullConfiguration', error as Error);
      throw error;
    }
  }

  async shouldRequireApproval(toolName: string): Promise<boolean> {
    const safetySettings = await this.cacheService.getSafetySettings();

    // Si no hay configuraciones, usar valores por defecto seguros
    if (!safetySettings) {
      return true; // Requerir aprobación por defecto
    }

    // Determinar si requiere aprobación basándose en el tipo de herramienta
    switch (toolName) {
      case "read_file":
        return !safetySettings.autoApproveRead;
      case "list_files":
      case "list_directory":
        return !safetySettings.autoApproveList;
      case "write_file":
      case "execute_command":
      case "delete_file":
        return safetySettings.confirmDangerous;
      default:
        return true; // Herramientas desconocidas requieren aprobación
    }
  }

  // ===== STATE MANAGEMENT =====

  async getState(): Promise<ExtensionState> {
    // Usar getFullConfiguration para obtener configuración normalizada
    const apiConfiguration = await this.getFullConfiguration();
    const taskHistory = await this.getTaskHistory();

    return {
      isNewUser: false,
      apiConfiguration,
      mode: "act" as Mode,
      clineMessages: (this.task?.clineMessages || []) as ClineMessage[],
      platform: "darwin" as Platform,
      taskHistory,
      version: "1.0.0",
    };
  }

  async postStateToRenderer(): Promise<void> {
    const state = await this.getState();
    this.mainWindow.webContents.send("state-update", state);
  }

  // ===== HISTORY MANAGEMENT =====

  async getTaskHistory(): Promise<HistoryItem[]> {
    return (await this.cacheService.getTaskHistory()) || [];
  }

  async saveTaskToHistory(task: HistoryItem): Promise<void> {
    const history = await this.getTaskHistory();
    history.unshift(task);

    // Keep only last 50 tasks
    if (history.length > 50) {
      history.splice(50);
    }

    await this.cacheService.setTaskHistory(history);
  }

  async deleteTaskFromHistory(taskId: string): Promise<void> {
    const history = await this.getTaskHistory();
    const filteredHistory = history.filter((item) => item.id !== taskId);
    await this.cacheService.setTaskHistory(filteredHistory);
  }

  // ===== MODEL INFORMATION =====

  async getAvailableModels(): Promise<ModelInfo[]> {
    const apiConfiguration = await this.getApiConfiguration();
    if (!apiConfiguration) {
      return [];
    }

    try {
      const apiHandler = buildApiHandler(apiConfiguration, "act");
      const model = apiHandler.getModel();
      return [model.info];
    } catch (error) {
      console.error("Error getting available models:", error);
      return [];
    }
  }

  // ===== MESSAGE HANDLING =====

  async handleWebviewMessage(message: any): Promise<any> {
    try {
      console.log(
        "🔄 [ElectronController] Received webview message:",
        message.type,
      );
      console.log(
        "🔄 [ElectronController] Message content:",
        message.text ? message.text.substring(0, 100) + "..." : "No text",
      );

      switch (message.type) {
        case "askCline":
          console.log("📝 [ElectronController] Processing askCline message");

          // Usar AIAgent tradicional primero (que funciona correctamente)
          console.log(
            "📝 [ElectronController] Using traditional AIAgent first",
          );
          await this.startTask(message.text);

          // Si tenemos SelfReflectiveAI disponible, analizar la respuesta después
          if (this.selfReflectiveAI) {
            console.log(
              "🧠 [ElectronController] Applying SelfReflective analysis to response",
            );
            try {
              // Obtener la última respuesta del task
              const lastResponse = this.getLastTaskResponse();

              if (lastResponse) {
                // Analizar la respuesta con SelfReflectiveAI incluyendo contexto de memoria
                const conversationHistory =
                  this.getConversationHistoryForAnalysis();
                const analysis = await this.selfReflectiveAI.analyzeResponse(
                  lastResponse,
                  message.text,
                );

                // ✅ NUEVO: Actualizar metadatos del debug logger
                await this.updateDebugMetadata({
                  wasAnalyzed: true,
                  hadError: analysis.hasError,
                  correctionApplied: analysis.needsCorrection,
                  analysisDetails: {
                    errorSeverity: analysis.errorSeverity,
                    canAutoFix: analysis.canAutoFix
                  }
                });

                // Si detecta errores (incluyendo inconsistencias de memoria) y puede corregir
                if (analysis.hasError && analysis.needsCorrection) {
                  console.log(
                    "🔧 [ElectronController] Error detected (including memory inconsistencies), generating correction",
                  );
                  const correction =
                    await this.selfReflectiveAI.generateCorrection(
                      analysis,
                      message.text,
                      lastResponse,
                    );

                  if (correction && correction.correctionType === "auto_fix") {
                    // Mostrar el razonamiento al usuario primero
                    console.log(
                      "🤖 [ElectronController] Showing reasoning and executing intelligent correction",
                    );

                    // 1. Mostrar el razonamiento al usuario
                    await this.showReasoningToUser(
                      analysis,
                      message.text,
                      lastResponse,
                    );

                    // 2. Obtener y ejecutar el comando alternativo
                    await this.executeIntelligentCorrection(
                      analysis,
                      message.text,
                      lastResponse,
                    );

                    console.log(
                      "✅ [ElectronController] Reasoning shown and correction executed",
                    );
                  }
                }
              }
            } catch (error) {
              console.error(
                "❌ [ElectronController] SelfReflective analysis failed:",
                error,
              );
              // No afecta el flujo principal, solo logging
            }
          }

          console.log(
            "✅ [ElectronController] askCline processed successfully",
          );
          return { success: true };
          break;

        case "clearTask":
          console.log("🗑️ [ElectronController] Processing clearTask message");
          await this.clearTask();
          console.log(
            "✅ [ElectronController] clearTask processed successfully",
          );
          break;

        case "getState":
          console.log("📊 [ElectronController] Processing getState message");
          const state = await this.getState();
          console.log(
            "✅ [ElectronController] getState processed successfully",
          );
          return state;

        case "updateApiConfiguration":
          console.log(
            "⚙️ [ElectronController] Processing updateApiConfiguration message",
          );
          await this.updateApiConfiguration(message.apiConfiguration);
          console.log(
            "✅ [ElectronController] updateApiConfiguration processed successfully",
          );
          break;

        case "getTaskHistory":
          console.log(
            "📚 [ElectronController] Processing getTaskHistory message",
          );
          const history = await this.getTaskHistory();
          console.log(
            "✅ [ElectronController] getTaskHistory processed successfully",
          );
          return history;

        case "deleteTaskFromHistory":
          console.log(
            "🗑️ [ElectronController] Processing deleteTaskFromHistory message",
          );
          await this.deleteTaskFromHistory(message.taskId);
          console.log(
            "✅ [ElectronController] deleteTaskFromHistory processed successfully",
          );
          break;

        case "exportTaskToMarkdown":
          console.log(
            "📄 [ElectronController] Processing exportTaskToMarkdown message (not implemented)",
          );
          // TODO: Implement export functionality
          break;

        case "approveCommand":
          console.log(
            "✅ [ElectronController] Processing approveCommand message",
          );
          return await this.handleApproveCommand(message.commandId);

        case "rejectCommand":
          console.log(
            "❌ [ElectronController] Processing rejectCommand message",
          );
          return await this.handleRejectCommand(message.commandId);

        default:
          console.warn(
            "⚠️ [ElectronController] Unknown message type:",
            message.type,
          );
          return { error: "Unknown message type", type: message.type };
      }

      // Return success for cases that don't explicitly return
      console.log("✅ [ElectronController] Message processed successfully");
      return { success: true };
    } catch (error) {
      console.error(
        "❌ [ElectronController] Error handling webview message:",
        error,
      );
      console.error(
        "❌ [ElectronController] Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      throw error;
    }
  }

  // ===== COMMAND CONFIRMATION HANDLERS =====

  /**
   * Maneja la aprobación de un comando por parte del usuario
   */
  private async handleApproveCommand(commandId: string): Promise<any> {
    try {
      console.log(`✅ [ElectronController] Approving command: ${commandId}`);

      if (!this.task) {
        console.error("❌ [ElectronController] No active task to approve command");
        return { success: false, error: "No active task" };
      }

      const success = this.task.approveCommand(commandId);

      if (success) {
        console.log(`✅ [ElectronController] Command approved successfully: ${commandId}`);
        return { success: true };
      } else {
        console.error(`❌ [ElectronController] Command not found or already processed: ${commandId}`);
        return { success: false, error: "Command not found or already processed" };
      }
    } catch (error) {
      console.error("❌ [ElectronController] Error approving command:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Maneja el rechazo de un comando por parte del usuario
   */
  private async handleRejectCommand(commandId: string): Promise<any> {
    try {
      console.log(`❌ [ElectronController] Rejecting command: ${commandId}`);

      if (!this.task) {
        console.error("❌ [ElectronController] No active task to reject command");
        return { success: false, error: "No active task" };
      }

      const success = this.task.rejectCommand(commandId);

      if (success) {
        console.log(`✅ [ElectronController] Command rejected successfully: ${commandId}`);
        return { success: true };
      } else {
        console.error(`❌ [ElectronController] Command not found or already processed: ${commandId}`);
        return { success: false, error: "Command not found or already processed" };
      }
    } catch (error) {
      console.error("❌ [ElectronController] Error rejecting command:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  // ===== CLEANUP =====

  async dispose(): Promise<void> {
    await this.clearTask();
    this.hostProvider.dispose();
    console.log("ElectronController disposed");
  }
}
