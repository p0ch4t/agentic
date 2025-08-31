/**
 * Sistema de gestión de contexto inteligente basado en Cline
 * Maneja truncamiento automático y preservación de contexto crítico
 */

export interface ContextWindow {
  maxTokens: number;
  bufferTokens: number;
  model: string;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tokens?: number;
  timestamp?: number;
  important?: boolean; // Marcar mensajes importantes que no deben eliminarse
}

export interface TruncationRange {
  start: number;
  end: number;
  tokensRemoved: number;
}

export class ContextManager {
  private contextWindows: Map<string, ContextWindow> = new Map();
  private conversationHistory: ConversationMessage[] = [];
  private deletedRanges: TruncationRange[] = [];

  constructor() {
    this.initializeContextWindows();
  }

  /**
   * Inicializa las ventanas de contexto para diferentes modelos
   */
  private initializeContextWindows(): void {
    // Configuraciones basadas en los límites reales de los modelos
    this.contextWindows.set("claude-3-sonnet-20240229", {
      maxTokens: 200000,
      bufferTokens: 40000,
      model: "claude-3-sonnet",
    });

    this.contextWindows.set("claude-3-5-haiku-20241022", {
      maxTokens: 200000,
      bufferTokens: 40000,
      model: "claude-3-5-haiku",
    });

    this.contextWindows.set("gpt-4o", {
      maxTokens: 128000,
      bufferTokens: 30000,
      model: "gpt-4o",
    });

    this.contextWindows.set("gpt-4o-mini", {
      maxTokens: 128000,
      bufferTokens: 30000,
      model: "gpt-4o-mini",
    });

    this.contextWindows.set("deepseek-chat", {
      maxTokens: 64000,
      bufferTokens: 27000,
      model: "deepseek",
    });

    // Configuración por defecto
    this.contextWindows.set("default", {
      maxTokens: 128000,
      bufferTokens: 30000,
      model: "default",
    });
  }

  /**
   * Estima el número de tokens en un texto
   * Aproximación: 1 token ≈ 4 caracteres para texto en inglés/español
   */
  private estimateTokens(text: string): number {
    // Estimación más precisa considerando diferentes tipos de contenido
    const codeRegex = /```[\s\S]*?```/g;
    const codeBlocks = text.match(codeRegex) || [];

    let totalTokens = 0;
    let remainingText = text;

    // Contar tokens en bloques de código (más densos)
    codeBlocks.forEach((block) => {
      const codeTokens = Math.ceil(block.length / 3); // Código es más denso
      totalTokens += codeTokens;
      remainingText = remainingText.replace(block, "");
    });

    // Contar tokens en texto normal
    const textTokens = Math.ceil(remainingText.length / 4);
    totalTokens += textTokens;

    return totalTokens;
  }

  /**
   * Agrega un mensaje a la conversación
   */
  addMessage(message: ConversationMessage): void {
    if (!message.tokens) {
      message.tokens = this.estimateTokens(message.content);
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    this.conversationHistory.push(message);
  }

  /**
   * Calcula el total de tokens en la conversación
   */
  getTotalTokens(): number {
    return this.conversationHistory.reduce(
      (total, msg) => total + (msg.tokens || 0),
      0,
    );
  }

  /**
   * Verifica si necesita truncamiento para un modelo específico
   */
  needsTruncation(modelId: string): boolean {
    const contextWindow =
      this.contextWindows.get(modelId) || this.contextWindows.get("default")!;
    const totalTokens = this.getTotalTokens();
    const maxAllowedTokens =
      contextWindow.maxTokens - contextWindow.bufferTokens;

    return totalTokens > maxAllowedTokens;
  }

  /**
   * Obtiene el siguiente rango de truncamiento
   * Basado en el algoritmo de Cline para preservar contexto importante
   */
  getNextTruncationRange(
    modelId: string,
    strategy: "half" | "quarter" | "aggressive" = "half",
  ): TruncationRange | null {
    const contextWindow =
      this.contextWindows.get(modelId) || this.contextWindows.get("default")!;
    const totalTokens = this.getTotalTokens();
    const targetReduction = this.getTargetReduction(totalTokens, strategy);

    // Siempre preservar el primer mensaje (tarea original) y los últimos mensajes
    const preserveStart = 1; // Preservar mensaje inicial
    const preserveEnd = Math.min(3, this.conversationHistory.length - 1); // Preservar últimos 3 mensajes

    // Encontrar el mejor rango para truncar
    let bestRange: TruncationRange | null = null;
    let tokensToRemove = 0;
    let startIndex = preserveStart;

    for (
      let i = preserveStart;
      i < this.conversationHistory.length - preserveEnd;
      i++
    ) {
      const message = this.conversationHistory[i];

      // No eliminar mensajes marcados como importantes
      if (message.important) {
        continue;
      }

      tokensToRemove += message.tokens || 0;

      if (tokensToRemove >= targetReduction) {
        bestRange = {
          start: startIndex,
          end: i + 1,
          tokensRemoved: tokensToRemove,
        };
        break;
      }
    }

    return bestRange;
  }

  /**
   * Calcula la reducción objetivo basada en la estrategia
   */
  private getTargetReduction(
    totalTokens: number,
    strategy: "half" | "quarter" | "aggressive",
  ): number {
    switch (strategy) {
      case "quarter":
        return Math.floor(totalTokens * 0.25);
      case "half":
        return Math.floor(totalTokens * 0.5);
      case "aggressive":
        return Math.floor(totalTokens * 0.75);
      default:
        return Math.floor(totalTokens * 0.5);
    }
  }

  /**
   * Ejecuta el truncamiento de la conversación
   */
  truncateConversation(range: TruncationRange): ConversationMessage[] {
    // Guardar información del rango eliminado
    this.deletedRanges.push(range);

    // Crear mensaje de notificación de truncamiento
    const truncationMessage: ConversationMessage = {
      role: "system",
      content: `[CONTEXT TRUNCATED] Removed ${range.tokensRemoved} tokens from conversation history (messages ${range.start} to ${range.end - 1}) to stay within context limits.`,
      tokens: this.estimateTokens(
        `[CONTEXT TRUNCATED] Removed ${range.tokensRemoved} tokens`,
      ),
      timestamp: Date.now(),
      important: true,
    };

    // Eliminar mensajes en el rango especificado
    const beforeTruncation = this.conversationHistory.slice(0, range.start);
    const afterTruncation = this.conversationHistory.slice(range.end);

    // Reconstruir conversación con mensaje de notificación
    this.conversationHistory = [
      ...beforeTruncation,
      truncationMessage,
      ...afterTruncation,
    ];

    return this.conversationHistory;
  }

  /**
   * Truncamiento automático si es necesario
   */
  autoTruncateIfNeeded(modelId: string): boolean {
    if (!this.needsTruncation(modelId)) {
      return false;
    }

    // Determinar estrategia basada en la presión del contexto
    const contextWindow =
      this.contextWindows.get(modelId) || this.contextWindows.get("default")!;
    const totalTokens = this.getTotalTokens();
    const maxAllowed = contextWindow.maxTokens - contextWindow.bufferTokens;
    const pressure = totalTokens / maxAllowed;

    let strategy: "half" | "quarter" | "aggressive" = "half";
    if (pressure > 1.5) {
      strategy = "aggressive";
    } else if (pressure > 1.2) {
      strategy = "half";
    } else {
      strategy = "quarter";
    }

    const range = this.getNextTruncationRange(modelId, strategy);
    if (range) {
      this.truncateConversation(range);
      console.log(
        `Context truncated: removed ${range.tokensRemoved} tokens using ${strategy} strategy`,
      );
      return true;
    }

    return false;
  }

  /**
   * Marca un mensaje como importante para evitar su eliminación
   */
  markMessageAsImportant(index: number): void {
    if (index >= 0 && index < this.conversationHistory.length) {
      this.conversationHistory[index].important = true;
    }
  }

  /**
   * Obtiene estadísticas del contexto
   */
  getContextStats(modelId: string): {
    totalTokens: number;
    maxTokens: number;
    bufferTokens: number;
    usagePercentage: number;
    needsTruncation: boolean;
    messagesCount: number;
    deletedRangesCount: number;
  } {
    const contextWindow =
      this.contextWindows.get(modelId) || this.contextWindows.get("default")!;
    const totalTokens = this.getTotalTokens();

    return {
      totalTokens,
      maxTokens: contextWindow.maxTokens,
      bufferTokens: contextWindow.bufferTokens,
      usagePercentage: (totalTokens / contextWindow.maxTokens) * 100,
      needsTruncation: this.needsTruncation(modelId),
      messagesCount: this.conversationHistory.length,
      deletedRangesCount: this.deletedRanges.length,
    };
  }

  /**
   * Obtiene la conversación actual
   */
  getConversation(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Limpia la conversación
   */
  clearConversation(): void {
    this.conversationHistory = [];
    this.deletedRanges = [];
  }

  /**
   * Obtiene información sobre rangos eliminados
   */
  getDeletedRanges(): TruncationRange[] {
    return [...this.deletedRanges];
  }
}
