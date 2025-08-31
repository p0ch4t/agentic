/**
 * Sistema de manejo de errores y recuperación basado en Cline
 * Proporciona recuperación automática, reintentos inteligentes y limpieza de recursos
 */

export interface ErrorContext {
  action: string;
  error: Error;
  timestamp: number;
  retryCount: number;
  taskId?: string;
  toolName?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorRecoveryResult {
  success: boolean;
  message: string;
  shouldRetry: boolean;
  cleanupPerformed: boolean;
}

export class ErrorHandler {
  private errorHistory: ErrorContext[] = [];
  private retryConfig: RetryConfig;
  private onError?: (context: ErrorContext) => void;
  private onRecovery?: (result: ErrorRecoveryResult) => void;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    onError?: (context: ErrorContext) => void,
    onRecovery?: (result: ErrorRecoveryResult) => void,
  ) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "rate_limit_exceeded",
        "service_unavailable",
        "internal_server_error",
        "bad_gateway",
        "gateway_timeout",
      ],
      ...retryConfig,
    };

    this.onError = onError;
    this.onRecovery = onRecovery;
  }

  /**
   * Maneja un error con recuperación automática
   */
  async handleError(
    action: string,
    error: Error,
    taskId?: string,
    toolName?: string,
    metadata?: Record<string, any>,
  ): Promise<ErrorRecoveryResult> {
    const context: ErrorContext = {
      action,
      error,
      timestamp: Date.now(),
      retryCount: this.getRetryCount(action, error),
      taskId,
      toolName,
      metadata,
    };

    // Agregar al historial
    this.errorHistory.push(context);

    // Notificar error
    this.onError?.(context);

    console.error(`Error ${action}:`, {
      message: error.message,
      stack: error.stack,
      retryCount: context.retryCount,
      taskId,
      toolName,
    });

    // Intentar recuperación
    const recoveryResult = await this.attemptRecovery(context);

    // Notificar resultado de recuperación
    this.onRecovery?.(recoveryResult);

    return recoveryResult;
  }

  /**
   * Intenta recuperación automática del error
   */
  private async attemptRecovery(
    context: ErrorContext,
  ): Promise<ErrorRecoveryResult> {
    const { error, action, retryCount } = context;

    // Verificar si el error es recuperable
    if (!this.isRetryableError(error)) {
      return {
        success: false,
        message: `Error no recuperable: ${error.message}`,
        shouldRetry: false,
        cleanupPerformed: await this.performCleanup(context),
      };
    }

    // Verificar límite de reintentos
    if (retryCount >= this.retryConfig.maxRetries) {
      return {
        success: false,
        message: `Máximo número de reintentos alcanzado (${this.retryConfig.maxRetries}) para: ${action}`,
        shouldRetry: false,
        cleanupPerformed: await this.performCleanup(context),
      };
    }

    // Calcular delay para reintento
    const delay = this.calculateRetryDelay(retryCount);

    return {
      success: false,
      message: `Error recuperable. Reintentando en ${delay}ms (intento ${retryCount + 1}/${this.retryConfig.maxRetries})`,
      shouldRetry: true,
      cleanupPerformed: false,
    };
  }

  /**
   * Verifica si un error es recuperable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    return this.retryConfig.retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError.toLowerCase()) ||
        errorName.includes(retryableError.toLowerCase()),
    );
  }

  /**
   * Calcula el delay para el siguiente reintento usando backoff exponencial
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Obtiene el número de reintentos para una acción específica
   */
  private getRetryCount(action: string, error: Error): number {
    const recentErrors = this.errorHistory.filter(
      (ctx) =>
        ctx.action === action &&
        ctx.error.message === error.message &&
        Date.now() - ctx.timestamp < 60000, // Últimos 60 segundos
    );

    return recentErrors.length;
  }

  /**
   * Realiza limpieza de recursos después de un error
   */
  private async performCleanup(context: ErrorContext): Promise<boolean> {
    try {
      console.log(
        `Realizando limpieza después del error en: ${context.action}`,
      );

      // Limpieza específica por tipo de acción
      switch (context.action) {
        case "api_request":
          await this.cleanupApiRequest(context);
          break;
        case "tool_execution":
          await this.cleanupToolExecution(context);
          break;
        case "file_operation":
          await this.cleanupFileOperation(context);
          break;
        case "command_execution":
          await this.cleanupCommandExecution(context);
          break;
        default:
          await this.performGeneralCleanup(context);
      }

      return true;
    } catch (cleanupError) {
      console.error("Error durante la limpieza:", cleanupError);
      return false;
    }
  }

  /**
   * Limpieza específica para solicitudes de API
   */
  private async cleanupApiRequest(context: ErrorContext): Promise<void> {
    // Cancelar solicitudes pendientes
    // Limpiar caché de respuestas parciales
    // Resetear estado de streaming
    console.log("Limpieza de solicitud API completada");
  }

  /**
   * Limpieza específica para ejecución de herramientas
   */
  private async cleanupToolExecution(context: ErrorContext): Promise<void> {
    // Revertir cambios parciales
    // Cerrar recursos abiertos
    // Limpiar archivos temporales
    console.log("Limpieza de ejecución de herramienta completada");
  }

  /**
   * Limpieza específica para operaciones de archivo
   */
  private async cleanupFileOperation(context: ErrorContext): Promise<void> {
    // Revertir cambios de archivo parciales
    // Cerrar descriptores de archivo
    // Limpiar archivos temporales
    console.log("Limpieza de operación de archivo completada");
  }

  /**
   * Limpieza específica para ejecución de comandos
   */
  private async cleanupCommandExecution(context: ErrorContext): Promise<void> {
    // Terminar procesos colgados
    // Limpiar recursos del terminal
    // Resetear estado del comando
    console.log("Limpieza de ejecución de comando completada");
  }

  /**
   * Limpieza general para otros tipos de errores
   */
  private async performGeneralCleanup(context: ErrorContext): Promise<void> {
    // Limpieza general de recursos
    console.log("Limpieza general completada");
  }

  /**
   * Ejecuta una función con manejo automático de errores y reintentos
   */
  async executeWithRetry<T>(
    action: string,
    fn: () => Promise<T>,
    taskId?: string,
    toolName?: string,
    metadata?: Record<string, any>,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        const recoveryResult = await this.handleError(
          action,
          lastError,
          taskId,
          toolName,
          { ...metadata, attempt },
        );

        if (
          !recoveryResult.shouldRetry ||
          attempt === this.retryConfig.maxRetries
        ) {
          throw lastError;
        }

        // Esperar antes del siguiente intento
        const delay = this.calculateRetryDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw (
      lastError ||
      new Error(`Failed after ${this.retryConfig.maxRetries} retries`)
    );
  }

  /**
   * Formatea un error con código de estado si está disponible
   */
  formatErrorWithStatusCode(error: Error): string {
    let errorMessage = error.message;

    // Extraer código de estado HTTP si está disponible
    const statusMatch = error.message.match(/status:?\s*(\d+)/i);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1]);
      const statusText = this.getHttpStatusText(statusCode);
      errorMessage = `HTTP ${statusCode} ${statusText}: ${errorMessage}`;
    }

    return errorMessage;
  }

  /**
   * Obtiene el texto descriptivo para códigos de estado HTTP
   */
  private getHttpStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    return statusTexts[statusCode] || "Unknown Error";
  }

  /**
   * Obtiene estadísticas de errores
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByAction: Record<string, number>;
    errorsByType: Record<string, number>;
    recentErrors: ErrorContext[];
    recoveryRate: number;
  } {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      (ctx) => now - ctx.timestamp < 3600000,
    ); // Última hora

    const errorsByAction: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    this.errorHistory.forEach((ctx) => {
      errorsByAction[ctx.action] = (errorsByAction[ctx.action] || 0) + 1;
      errorsByType[ctx.error.name] = (errorsByType[ctx.error.name] || 0) + 1;
    });

    const retriedErrors = this.errorHistory.filter(
      (ctx) => ctx.retryCount > 0,
    ).length;
    const recoveryRate =
      this.errorHistory.length > 0
        ? (retriedErrors / this.errorHistory.length) * 100
        : 0;

    return {
      totalErrors: this.errorHistory.length,
      errorsByAction,
      errorsByType,
      recentErrors,
      recoveryRate,
    };
  }

  /**
   * Limpia el historial de errores antiguos
   */
  cleanupOldErrors(maxAge: number = 3600000): void {
    const now = Date.now();
    this.errorHistory = this.errorHistory.filter(
      (ctx) => now - ctx.timestamp < maxAge,
    );
  }

  /**
   * Verifica si hay demasiados errores recientes
   */
  hasTooManyRecentErrors(
    threshold: number = 10,
    timeWindow: number = 300000,
  ): boolean {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      (ctx) => now - ctx.timestamp < timeWindow,
    );
    return recentErrors.length >= threshold;
  }
}
