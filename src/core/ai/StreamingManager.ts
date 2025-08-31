/**
 * Sistema de streaming mejorado basado en los patrones de Cline
 * Maneja streaming en tiempo real con prevención de condiciones de carrera
 */

export interface StreamChunk {
  type: "text" | "tool_use" | "error" | "complete";
  content: string;
  partial?: boolean;
  toolCall?: any;
  metadata?: Record<string, any>;
}

export interface ContentBlock {
  type: "text" | "tool_use";
  content: string;
  partial: boolean;
  toolCall?: any;
  id?: string;
}

export class StreamingManager {
  private presentAssistantMessageLocked = false;
  private presentAssistantMessageHasPendingUpdates = false;
  private currentStreamingContentIndex = 0;
  private assistantMessageContent: ContentBlock[] = [];
  private onContentUpdate?: (content: ContentBlock[], index: number) => void;
  private onComplete?: () => void;
  private onError?: (error: Error) => void;

  constructor(
    onContentUpdate?: (content: ContentBlock[], index: number) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void,
  ) {
    this.onContentUpdate = onContentUpdate;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  /**
   * Procesa un chunk de streaming y actualiza el contenido
   */
  async processStreamChunk(chunk: StreamChunk): Promise<void> {
    try {
      switch (chunk.type) {
        case "text":
          await this.handleTextChunk(chunk);
          break;
        case "tool_use":
          await this.handleToolUseChunk(chunk);
          break;
        case "error":
          await this.handleErrorChunk(chunk);
          break;
        case "complete":
          await this.handleCompleteChunk();
          break;
      }

      // Presentar contenido actualizado
      await this.presentAssistantMessage();
    } catch (error) {
      console.error("Error processing stream chunk:", error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Maneja chunks de texto con contenido parcial
   */
  private async handleTextChunk(chunk: StreamChunk): Promise<void> {
    const currentBlock = this.getCurrentOrCreateBlock("text");

    if (chunk.partial) {
      // Actualizar contenido parcial
      currentBlock.content = chunk.content;
      currentBlock.partial = true;
    } else {
      // Completar bloque actual
      currentBlock.content = chunk.content;
      currentBlock.partial = false;
      this.moveToNextBlock();
    }
  }

  /**
   * Maneja chunks de uso de herramientas
   */
  private async handleToolUseChunk(chunk: StreamChunk): Promise<void> {
    const currentBlock = this.getCurrentOrCreateBlock("tool_use");
    currentBlock.content = chunk.content;
    currentBlock.toolCall = chunk.toolCall;
    currentBlock.partial = chunk.partial || false;

    if (!chunk.partial) {
      this.moveToNextBlock();
    }
  }

  /**
   * Maneja chunks de error
   */
  private async handleErrorChunk(chunk: StreamChunk): Promise<void> {
    const error = new Error(chunk.content);
    this.onError?.(error);
  }

  /**
   * Maneja la finalización del stream
   */
  private async handleCompleteChunk(): Promise<void> {
    // Marcar el último bloque como completo si está parcial
    if (this.assistantMessageContent.length > 0) {
      const lastBlock =
        this.assistantMessageContent[this.assistantMessageContent.length - 1];
      if (lastBlock.partial) {
        lastBlock.partial = false;
      }
    }

    this.onComplete?.();
  }

  /**
   * Obtiene o crea un bloque de contenido
   */
  private getCurrentOrCreateBlock(type: "text" | "tool_use"): ContentBlock {
    let currentBlock =
      this.assistantMessageContent[this.currentStreamingContentIndex];

    if (!currentBlock || currentBlock.type !== type) {
      currentBlock = {
        type,
        content: "",
        partial: true,
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      this.assistantMessageContent[this.currentStreamingContentIndex] =
        currentBlock;
    }

    return currentBlock;
  }

  /**
   * Avanza al siguiente bloque de contenido
   */
  private moveToNextBlock(): void {
    this.currentStreamingContentIndex++;
  }

  /**
   * Presenta el mensaje del asistente con prevención de condiciones de carrera
   * Basado en el patrón de Cline para evitar race conditions
   */
  private async presentAssistantMessage(): Promise<void> {
    // Prevenir condiciones de carrera con locks
    if (this.presentAssistantMessageLocked) {
      this.presentAssistantMessageHasPendingUpdates = true;
      return;
    }

    this.presentAssistantMessageLocked = true;

    try {
      // Procesar actualizaciones pendientes
      do {
        this.presentAssistantMessageHasPendingUpdates = false;

        // Obtener bloque actual
        const currentBlock =
          this.assistantMessageContent[this.currentStreamingContentIndex];

        if (currentBlock) {
          // Notificar actualización de contenido
          this.onContentUpdate?.(
            this.assistantMessageContent,
            this.currentStreamingContentIndex,
          );
        }

        // Pequeña pausa para permitir que se procesen las actualizaciones
        await new Promise((resolve) => setTimeout(resolve, 10));
      } while (this.presentAssistantMessageHasPendingUpdates);
    } finally {
      this.presentAssistantMessageLocked = false;
    }
  }

  /**
   * Reinicia el estado del streaming
   */
  reset(): void {
    this.assistantMessageContent = [];
    this.currentStreamingContentIndex = 0;
    this.presentAssistantMessageLocked = false;
    this.presentAssistantMessageHasPendingUpdates = false;
  }

  /**
   * Obtiene el contenido actual completo
   */
  getCurrentContent(): ContentBlock[] {
    return [...this.assistantMessageContent];
  }

  /**
   * Obtiene el texto completo concatenado
   */
  getFullText(): string {
    return this.assistantMessageContent
      .filter((block) => block.type === "text")
      .map((block) => block.content)
      .join("");
  }

  /**
   * Obtiene todas las llamadas a herramientas
   */
  getToolCalls(): any[] {
    return this.assistantMessageContent
      .filter((block) => block.type === "tool_use" && block.toolCall)
      .map((block) => block.toolCall);
  }

  /**
   * Verifica si hay contenido parcial pendiente
   */
  hasPartialContent(): boolean {
    return this.assistantMessageContent.some((block) => block.partial);
  }
}
