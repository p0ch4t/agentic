/**
 * AI Agent con Capacidades de Auto-Reflexión Inteligente
 *
 * Extiende el AIAgent existente de Cline con la capacidad de:
 * 1. Analizar sus propias respuestas automáticamente
 * 2. Detectar errores usando comprensión semántica (no patrones)
 * 3. Generar correcciones automáticas cuando es posible
 * 4. Proporcionar segundas respuestas mejoradas
 */

import {
  IntelligentResponseAnalyzer,
  IntelligentAnalysis,
  SmartCorrection,
} from "./ResponseAnalyzer";
import { ElectronHostProvider } from "../../host/ElectronHostProvider";
import { debugLogger } from "../logging/DebugConversationLogger";

export interface AIConfiguration {
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  toolCalls?: any[];
  reasoning?: string;
}

export interface SelfReflectiveResponse extends AIResponse {
  wasAnalyzed: boolean;
  analysis?: IntelligentAnalysis;
  correction?: SmartCorrection;
  originalResponse?: string;
  correctedResponse?: string;
}

export class SelfReflectiveAIAgent {
  private responseAnalyzer: IntelligentResponseAnalyzer;
  private enableAutoCorrection: boolean = true;
  private aiConfig: AIConfiguration; // Copia local de la configuración
  private correctionHistory: Array<{
    timestamp: number;
    originalRequest: string;
    originalResponse: string;
    correction: SmartCorrection;
  }> = [];

  constructor(hostProvider: ElectronHostProvider, config: AIConfiguration) {
    // Guardar configuración localmente
    this.aiConfig = config;

    // Inicializar el analizador inteligente
    this.responseAnalyzer = new IntelligentResponseAnalyzer(
      hostProvider,
      config, // Pasar configuración para que pueda usar el mismo LLM
    );
  }

  /**
   * Analiza una respuesta existente con auto-reflexión y corrección automática
   */
  async analyzeResponseWithSelfReflection(
    userMessage: string,
    initialResponse: AIResponse,
  ): Promise<SelfReflectiveResponse> {
    console.log(
      "🧠 [Self-Reflective AI] Procesando mensaje con auto-reflexión...",
    );
    const startTime = Date.now();

    // 2. Analizar la respuesta automáticamente
    console.log("🔍 [Self-Analysis] Analizando respuesta inicial...");
    const analysis = await this.responseAnalyzer.analyzeResponseIntelligently(
      initialResponse.content,
      userMessage,
      initialResponse.toolCalls?.map((tc) => ({
        name: tc.function.name,
        result: tc,
      })),
    );

    // 3. Si no hay errores, devolver respuesta original
    if (!analysis.hasError || !analysis.needsCorrection) {
      console.log("✅ [Self-Analysis] Respuesta inicial es correcta");
      return {
        ...initialResponse,
        wasAnalyzed: true,
        analysis,
      };
    }

    // 4. Si hay errores y auto-corrección está habilitada, generar corrección
    if (this.enableAutoCorrection && analysis.canAutoFix) {
      console.log("🔧 [Auto-Correction] Generando corrección automática...");

      try {
        const correction =
          await this.responseAnalyzer.generateIntelligentCorrection(
            analysis,
            userMessage,
            initialResponse.content,
          );

        if (correction && correction.correctionType === "auto_fix") {
          // Registrar la corrección en el historial
          this.correctionHistory.push({
            timestamp: Date.now(),
            originalRequest: userMessage,
            originalResponse: initialResponse.content,
            correction,
          });

          console.log("✅ [Auto-Correction] Corrección automática aplicada");

          const correctedResponse = {
            ...initialResponse,
            content: correction.correctionText,
            wasAnalyzed: true,
            analysis,
            correction,
            originalResponse: initialResponse.content,
            correctedResponse: correction.correctionText,
          };

          // Registrar conversación con corrección aplicada
          await debugLogger.logConversation(
            userMessage,
            correctedResponse.content,
            {
              wasAnalyzed: true,
              hadError: true,
              correctionApplied: true,
              toolsUsed: initialResponse.toolCalls?.map(
                (tc) => tc.function.name,
              ),
              responseTime: Date.now() - startTime,
              metadata: {
                model: this.aiConfig.model,
                temperature: this.aiConfig.temperature,
                errorSeverity: analysis.errorSeverity,
                confidence: analysis.confidence,
                correctionType: correction.correctionType,
                originalResponseLength: initialResponse.content.length,
                correctedResponseLength: correction.correctionText.length,
              },
            },
          );

          return correctedResponse;
        }
      } catch (error) {
        console.error(
          "❌ [Auto-Correction] Error en corrección automática:",
          error,
        );
      }
    }

    // 5. Si no se puede auto-corregir, generar explicación
    console.log("📝 [Guided-Correction] Generando explicación del error...");

    try {
      const correction =
        await this.responseAnalyzer.generateIntelligentCorrection(
          analysis,
          userMessage,
          initialResponse.content,
        );

      if (correction) {
        return {
          ...initialResponse,
          content: `${initialResponse.content}\n\n---\n\n${correction.correctionText}`,
          wasAnalyzed: true,
          analysis,
          correction,
          originalResponse: initialResponse.content,
        };
      }
    } catch (error) {
      console.error(
        "❌ [Guided-Correction] Error en corrección guiada:",
        error,
      );
    }

    // 6. Fallback: devolver respuesta original con análisis
    const finalResponse = {
      ...initialResponse,
      wasAnalyzed: true,
      analysis,
    };

    // 7. Registrar conversación en debug log
    await debugLogger.logConversation(userMessage, finalResponse.content, {
      wasAnalyzed: finalResponse.wasAnalyzed,
      hadError: analysis.hasError,
      correctionApplied: false,
      toolsUsed: initialResponse.toolCalls?.map((tc) => tc.function.name),
      responseTime: Date.now() - startTime,
      metadata: {
        model: this.aiConfig.model,
        temperature: this.aiConfig.temperature,
        errorSeverity: analysis.errorSeverity,
        confidence: analysis.confidence,
      },
    });

    return finalResponse;
  }

  // Método eliminado - ahora SelfReflectiveAIAgent es solo un analizador de respuestas

  /**
   * Habilita o deshabilita la corrección automática
   */
  setAutoCorrection(enabled: boolean): void {
    this.enableAutoCorrection = enabled;
    console.log(
      `🔧 [Config] Auto-corrección ${enabled ? "habilitada" : "deshabilitada"}`,
    );
  }

  /**
   * Obtiene estadísticas de correcciones realizadas
   */
  getCorrectionStats(): {
    totalCorrections: number;
    recentCorrections: number;
    correctionTypes: Record<string, number>;
    averageConfidence: number;
  } {
    const now = Date.now();
    const recentCorrections = this.correctionHistory.filter(
      (c) => now - c.timestamp < 3600000, // Última hora
    );

    const correctionTypes: Record<string, number> = {};
    let totalConfidence = 0;

    this.correctionHistory.forEach((correction) => {
      const type = correction.correction.correctionType;
      correctionTypes[type] = (correctionTypes[type] || 0) + 1;
    });

    return {
      totalCorrections: this.correctionHistory.length,
      recentCorrections: recentCorrections.length,
      correctionTypes,
      averageConfidence:
        this.correctionHistory.length > 0
          ? totalConfidence / this.correctionHistory.length
          : 0,
    };
  }

  /**
   * Limpia el historial de correcciones antiguas
   */
  cleanupCorrectionHistory(maxAge: number = 86400000): void {
    // 24 horas por defecto
    const now = Date.now();
    this.correctionHistory = this.correctionHistory.filter(
      (c) => now - c.timestamp < maxAge,
    );
  }

  /**
   * Obtiene el historial de correcciones recientes
   */
  getRecentCorrections(limit: number = 10): Array<{
    timestamp: number;
    originalRequest: string;
    correctionType: string;
    wasSuccessful: boolean;
  }> {
    return this.correctionHistory.slice(-limit).map((c) => ({
      timestamp: c.timestamp,
      originalRequest: c.originalRequest.substring(0, 100) + "...",
      correctionType: c.correction.correctionType,
      wasSuccessful: !c.correction.requiresUserInput,
    }));
  }

  /**
   * Fuerza un análisis manual de una respuesta específica
   */
  async analyzeResponse(
    response: string,
    originalRequest: string,
  ): Promise<IntelligentAnalysis> {
    return await this.responseAnalyzer.analyzeResponseIntelligently(
      response,
      originalRequest,
    );
  }

  /**
   * Genera una corrección manual para una respuesta específica
   */
  async generateCorrection(
    analysis: IntelligentAnalysis,
    originalRequest: string,
    originalResponse: string,
  ): Promise<SmartCorrection | null> {
    return await this.responseAnalyzer.generateIntelligentCorrection(
      analysis,
      originalRequest,
      originalResponse,
    );
  }

  /**
   * Finaliza la sesión de debug y exporta el log
   */
  async finalizeDebugSession(): Promise<string | null> {
    try {
      await debugLogger.finalizeSession();
      return await debugLogger.exportLogForSharing();
    } catch (error) {
      console.error("❌ [Debug Logger] Error finalizando sesión:", error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de la sesión actual
   */
  getDebugStats(): any {
    return debugLogger.getSessionStats();
  }
}

/**
 * Factory function para crear un SelfReflectiveAIAgent
 */
export function createSelfReflectiveAI(
  hostProvider: ElectronHostProvider,
  config: AIConfiguration,
): SelfReflectiveAIAgent {
  return new SelfReflectiveAIAgent(hostProvider, config);
}

export default SelfReflectiveAIAgent;
