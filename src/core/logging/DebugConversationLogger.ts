/**
 * Sistema de Logging de Conversaciones para Debug
 *
 * Registra todas las conversaciones cuando el programa está en modo debug
 * para análisis posterior y mejoras del comportamiento del AI
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface ConversationEntry {
  timestamp: string;
  sessionId: string;
  userMessage: string;
  aiResponse: string;
  wasAnalyzed?: boolean;
  hadError?: boolean;
  correctionApplied?: boolean;
  toolsUsed?: string[];
  responseTime?: number;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}

export interface DebugSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  totalMessages: number;
  errorsDetected: number;
  correctionsApplied: number;
  averageResponseTime: number;
  conversations: ConversationEntry[];
}

export class DebugConversationLogger {
  private isDebugMode: boolean = false;
  private currentSession: DebugSession | null = null;
  private logFilePath: string;
  private sessionStartTime: number = 0;

  constructor() {
    // Detectar modo debug desde variables de entorno
    this.isDebugMode =
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_MODE === "true" ||
      process.argv.includes("--debug");

    // Crear ruta del archivo de log
    const logDir = path.join(os.homedir(), ".cline-desktop", "debug-logs");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFilePath = path.join(logDir, `debug_conversation_${timestamp}.log`);

    if (this.isDebugMode) {
      this.initializeDebugSession();
      console.log("🐛 [Debug Logger] Modo debug activado - Logging habilitado");
      console.log("📝 [Debug Logger] Archivo de log:", this.logFilePath);
    }
  }

  /**
   * Inicializa una nueva sesión de debug
   */
  private async initializeDebugSession(): Promise<void> {
    this.sessionStartTime = Date.now();

    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: new Date().toISOString(),
      totalMessages: 0,
      errorsDetected: 0,
      correctionsApplied: 0,
      averageResponseTime: 0,
      conversations: [],
    };

    // Crear directorio si no existe
    await this.ensureLogDirectory();

    // Escribir header del archivo
    await this.writeLogHeader();
  }

  /**
   * Registra una conversación completa
   */
  async logConversation(
    userMessage: string,
    aiResponse: string,
    options: {
      wasAnalyzed?: boolean;
      hadError?: boolean;
      correctionApplied?: boolean;
      toolsUsed?: string[];
      responseTime?: number;
      metadata?: any;
    } = {},
  ): Promise<void> {
    if (!this.isDebugMode || !this.currentSession) {
      return;
    }

    const entry: ConversationEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession.sessionId,
      userMessage: this.sanitizeForLog(userMessage),
      aiResponse: this.sanitizeForLog(aiResponse),
      wasAnalyzed: options.wasAnalyzed,
      hadError: options.hadError,
      correctionApplied: options.correctionApplied,
      toolsUsed: options.toolsUsed,
      responseTime: options.responseTime,
      metadata: options.metadata,
    };

    // Agregar a la sesión actual
    this.currentSession.conversations.push(entry);
    this.currentSession.totalMessages++;

    if (options.hadError) {
      this.currentSession.errorsDetected++;
    }

    if (options.correctionApplied) {
      this.currentSession.correctionsApplied++;
    }

    // Escribir al archivo inmediatamente
    await this.writeConversationEntry(entry);

    console.log("📝 [Debug Logger] Conversación registrada:", {
      messageLength: userMessage.length,
      responseLength: aiResponse.length,
      hadError: options.hadError,
      correctionApplied: options.correctionApplied,
    });
  }

  /**
   * Registra un error específico del sistema
   */
  async logSystemError(
    error: Error,
    context: string,
    additionalData?: any,
  ): Promise<void> {
    if (!this.isDebugMode) {
      return;
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      type: "SYSTEM_ERROR",
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      additionalData,
    };

    await this.appendToLog("\n--- SYSTEM ERROR ---");
    await this.appendToLog(JSON.stringify(errorEntry, null, 2));
    await this.appendToLog("--- END ERROR ---\n");
  }

  /**
   * Registra métricas de rendimiento
   */
  async logPerformanceMetrics(metrics: {
    operation: string;
    duration: number;
    memoryUsage?: number;
    tokensUsed?: number;
    [key: string]: any;
  }): Promise<void> {
    if (!this.isDebugMode) {
      return;
    }

    const metricsEntry = {
      timestamp: new Date().toISOString(),
      type: "PERFORMANCE_METRICS",
      ...metrics,
    };

    await this.appendToLog("\n--- PERFORMANCE METRICS ---");
    await this.appendToLog(JSON.stringify(metricsEntry, null, 2));
    await this.appendToLog("--- END METRICS ---\n");
  }

  /**
   * Finaliza la sesión de debug
   */
  async finalizeSession(): Promise<void> {
    if (!this.isDebugMode || !this.currentSession) {
      return;
    }

    this.currentSession.endTime = new Date().toISOString();

    // Calcular métricas finales
    const responseTimes = this.currentSession.conversations
      .map((c) => c.responseTime)
      .filter((rt) => rt !== undefined) as number[];

    this.currentSession.averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Escribir resumen final
    await this.writeSessionSummary();

    console.log("🏁 [Debug Logger] Sesión finalizada:", {
      totalMessages: this.currentSession.totalMessages,
      errorsDetected: this.currentSession.errorsDetected,
      correctionsApplied: this.currentSession.correctionsApplied,
      averageResponseTime: this.currentSession.averageResponseTime,
    });
  }

  /**
   * Obtiene estadísticas de la sesión actual
   */
  getSessionStats(): any {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.sessionId,
      duration: Date.now() - this.sessionStartTime,
      totalMessages: this.currentSession.totalMessages,
      errorsDetected: this.currentSession.errorsDetected,
      correctionsApplied: this.currentSession.correctionsApplied,
      errorRate:
        this.currentSession.totalMessages > 0
          ? (this.currentSession.errorsDetected /
              this.currentSession.totalMessages) *
            100
          : 0,
      correctionRate:
        this.currentSession.errorsDetected > 0
          ? (this.currentSession.correctionsApplied /
              this.currentSession.errorsDetected) *
            100
          : 0,
    };
  }

  /**
   * Exporta el log actual para compartir
   */
  async exportLogForSharing(): Promise<string> {
    if (!this.isDebugMode || !this.currentSession) {
      throw new Error("No hay sesión de debug activa para exportar");
    }

    // Crear versión anonimizada para compartir
    const anonymizedSession = {
      ...this.currentSession,
      conversations: this.currentSession.conversations.map((conv) => ({
        ...conv,
        userMessage: this.anonymizeMessage(conv.userMessage),
        aiResponse: this.anonymizeMessage(conv.aiResponse),
      })),
    };

    const exportPath = this.logFilePath.replace(".log", "_export.json");
    await fs.writeFile(exportPath, JSON.stringify(anonymizedSession, null, 2));

    console.log("📤 [Debug Logger] Log exportado para compartir:", exportPath);
    return exportPath;
  }

  // Métodos privados

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureLogDirectory(): Promise<void> {
    const logDir = path.dirname(this.logFilePath);
    try {
      await fs.access(logDir);
    } catch {
      await fs.mkdir(logDir, { recursive: true });
    }
  }

  private async writeLogHeader(): Promise<void> {
    const header = `
=== DEBUG CONVERSATION LOG ===
Sesión: ${this.currentSession?.sessionId}
Inicio: ${this.currentSession?.startTime}
Modo Debug: ${this.isDebugMode}
Node Version: ${process.version}
Platform: ${process.platform}
===================================

`;
    await fs.writeFile(this.logFilePath, header);
  }

  private async writeConversationEntry(
    entry: ConversationEntry,
  ): Promise<void> {
    const logEntry = `
--- CONVERSACIÓN ${entry.timestamp} ---
Usuario: ${entry.userMessage}

AI: ${entry.aiResponse}

Metadata:
- Analizada: ${entry.wasAnalyzed || false}
- Error detectado: ${entry.hadError || false}
- Corrección aplicada: ${entry.correctionApplied || false}
- Herramientas usadas: ${entry.toolsUsed?.join(", ") || "ninguna"}
- Tiempo de respuesta: ${entry.responseTime || "N/A"}ms
- Datos adicionales: ${JSON.stringify(entry.metadata || {}, null, 2)}
--- FIN CONVERSACIÓN ---

`;
    await this.appendToLog(logEntry);
  }

  private async writeSessionSummary(): Promise<void> {
    const summary = `
=== RESUMEN DE SESIÓN ===
Sesión ID: ${this.currentSession?.sessionId}
Duración: ${Date.now() - this.sessionStartTime}ms
Total mensajes: ${this.currentSession?.totalMessages}
Errores detectados: ${this.currentSession?.errorsDetected}
Correcciones aplicadas: ${this.currentSession?.correctionsApplied}
Tiempo promedio respuesta: ${this.currentSession?.averageResponseTime}ms
Tasa de error: ${this.getSessionStats()?.errorRate.toFixed(2)}%
Tasa de corrección: ${this.getSessionStats()?.correctionRate.toFixed(2)}%
=== FIN RESUMEN ===
`;
    await this.appendToLog(summary);
  }

  private async appendToLog(content: string): Promise<void> {
    try {
      await fs.appendFile(this.logFilePath, content);
    } catch (error) {
      console.error("❌ [Debug Logger] Error escribiendo log:", error);
    }
  }

  private sanitizeForLog(message: string): string {
    // Limitar longitud para evitar logs gigantes
    const maxLength = 2000;
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + "... [TRUNCADO]";
    }
    return message;
  }

  private anonymizeMessage(message: string): string {
    // Remover información sensible para compartir
    return message
      .replace(/\/Users\/[^\/\s]+/g, "/Users/[USER]")
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "[IP]")
      .replace(/[a-f0-9]{32,}/g, "[HASH]");
  }
}

// Singleton para uso global
export const debugLogger = new DebugConversationLogger();

export default DebugConversationLogger;
