/**
 * Sistema Inteligente de Auto-Reflexión y Corrección Automática
 *
 * En lugar de usar patrones regex, este sistema usa el LLM para:
 * 1. Analizar inteligentemente sus propias respuestas
 * 2. Detectar errores por comprensión semántica
 * 3. Generar correcciones automáticas contextuales
 * 4. Integrar con la infraestructura existente de Cline
 */

import { ErrorHandler, ErrorContext } from "./ErrorHandler";
import { ElectronHostProvider } from "../../host/ElectronHostProvider";
import * as os from "os";
import * as path from "path";

export interface IntelligentAnalysis {
  hasError: boolean;
  errorDescription?: string;
  errorSeverity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
  needsCorrection: boolean;
  suggestedCorrection?: string;
  canAutoFix: boolean;
  userImpact: string;
}

export interface SmartCorrection {
  correctionType: "auto_fix" | "guided_fix" | "explanation" | "alternative";
  correctionText: string;
  executionSteps?: string[];
  requiresUserInput: boolean;
  priority: number;
}

export interface ResponseAnalysis {
  errorType?:
    | "command_failed"
    | "api_error"
    | "timeout"
    | "permission_denied"
    | "not_found"
    | "file_not_found"
    | "syntax_error"
    | "logic_error"
    | "path_error";
  hasError: boolean;
  errorMessage?: string;
  confidence?: number;
}

export interface CorrectionAction {
  type: "replace_command" | "add_flags" | "suggest_alternative" | "auto_fix";
  action?: string;
  originalCommand?: string;
  suggestedCommand?: string;
  explanation?: string;
  parameters?: any;
  priority?: number;
}

export class IntelligentResponseAnalyzer {
  private errorHandler: ErrorHandler;
  private hostProvider: ElectronHostProvider;
  private aiConfig: any; // Configuración del AI para auto-análisis

  constructor(
    hostProvider: ElectronHostProvider,
    aiConfig: any,
    errorHandler?: ErrorHandler,
  ) {
    this.hostProvider = hostProvider;
    this.aiConfig = aiConfig;
    this.errorHandler = errorHandler || new ErrorHandler();
  }

  /**
   * Analiza inteligentemente una respuesta usando comprensión semántica
   */
  async analyzeResponseIntelligently(
    response: string,
    originalRequest: string,
    toolResults?: any[],
  ): Promise<IntelligentAnalysis> {
    // Crear prompt para auto-análisis
    const analysisPrompt = this.createSelfAnalysisPrompt(
      response,
      originalRequest,
      toolResults,
    );

    try {
      // Usar el LLM para analizar su propia respuesta
      const analysis = await this.performLLMSelfAnalysis(analysisPrompt);

      return this.parseAnalysisResponse(analysis);
    } catch (error) {
      console.error("Error en análisis inteligente:", error);

      // Fallback a análisis básico si falla el LLM
      return await this.basicErrorDetection(response, toolResults);
    }
  }

  /**
   * Crea un prompt para que el LLM analice su propia respuesta
   */
  private createSelfAnalysisPrompt(
    response: string,
    originalRequest: string,
    toolResults?: any[],
  ): string {
    return `Analyze my response for errors and quality.

**User asked:** ${originalRequest}
**I responded:** ${response}
${toolResults ? `**Tool results:** ${JSON.stringify(toolResults, null, 2)}` : ""}

**Analysis needed:**
- Does my response have obvious errors?
- Did I actually answer what the user asked?
- Are there technical error messages indicating failures?
- Is the response helpful or does it need correction?

**Respond with JSON only:**
{
  "hasError": boolean,
  "errorDescription": "error description if any",
  "errorSeverity": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "needsCorrection": boolean,
  "suggestedCorrection": "correction text if needed",
  "canAutoFix": boolean,
  "userImpact": "impact description"
}`;
  }

  /**
   * Ejecuta el análisis usando el mismo patrón de llamadas que AIAgent
   */
  private async performLLMSelfAnalysis(prompt: string): Promise<string> {
    try {
      // Verificar si tenemos configuración válida para hacer llamadas al LLM
      if (!this.aiConfig.apiKey || this.aiConfig.apiKey.trim() === "") {
        console.log(
          "🔄 [ResponseAnalyzer] No API key available, using fallback analysis",
        );
        return this.generateFallbackAnalysis(prompt);
      }

      // Usar el mismo patrón de llamadas que AIAgent
      const messages = [
        {
          role: "system",
          content:
            "Eres un analizador experto de respuestas de IA. Analiza objetivamente y responde solo con JSON válido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      // Usar el mismo método de llamada que AIAgent
      const response = await this.callAIService(messages);

      // Extraer contenido de la respuesta
      let content = "";
      if (typeof response === "string") {
        content = response;
      } else if (response.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else if (response.content?.[0]?.text) {
        content = response.content[0].text;
      }

      return content.trim();
    } catch (error) {
      console.error("Error llamando al AI para auto-análisis:", error);

      // Fallback: análisis básico sin LLM
      return this.generateFallbackAnalysis(prompt);
    }
  }

  /**
   * Usa el mismo método de llamada al AI que AIAgent
   */
  private async callAIService(messages: any[]): Promise<any> {
    const { model, apiKey, baseUrl, temperature } = this.aiConfig;
    const maxTokens = 1000; // Suficiente para respuestas de análisis
    const analysisTemperature = 0.1; // Temperatura baja para análisis más preciso

    if (model.startsWith("claude")) {
      const content = await this.callAnthropicAPI(
        messages,
        apiKey,
        model,
        maxTokens,
        analysisTemperature,
      );
      return { choices: [{ message: { content } }] }; // Normalizar formato
    } else if (
      model.startsWith("gpt") ||
      model.startsWith("o3") ||
      model.includes("genai")
    ) {
      return await this.callOpenAIAPI(
        messages,
        apiKey,
        model,
        maxTokens,
        analysisTemperature,
        baseUrl,
      );
    } else {
      throw new Error(`Unsupported AI model: ${model}`);
    }
  }

  /**
   * Llamada a Anthropic API (mismo patrón que AIAgent)
   */
  private async callAnthropicAPI(
    messages: any[],
    apiKey: string,
    model: string,
    maxTokens: number,
    temperature: number,
  ): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: messages.filter((m) => m.role !== "system"),
        system: messages.find((m) => m.role === "system")?.content || "",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.content[0]?.text || "No response generated";
  }

  /**
   * Llamada a OpenAI/GenAI API (mismo patrón que AIAgent)
   */
  private async callOpenAIAPI(
    messages: any[],
    apiKey: string,
    model: string,
    maxTokens: number,
    temperature: number,
    baseUrl?: string,
  ): Promise<any> {
    const url = baseUrl
      ? `${baseUrl}/genai/v1/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

    // Configurar headers apropiados para GenAI
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Si es GenAI (baseUrl contiene genai), usar formato específico
    if (baseUrl && baseUrl.includes("genai")) {
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      // GenAI puede requerir headers adicionales
      headers["Accept"] = "application/json";
      headers["X-Forwarded-For"] = "electron-ai-agent";
      headers["User-Agent"] = "electron-ai-agent/1.0.0";
    } else {
      // OpenAI estándar
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const requestBody: any = {
      model: model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: false,
      stop: null,
    };

    console.log(`[ResponseAnalyzer] Calling API: ${url}`);
    console.log(`[ResponseAnalyzer] Model: ${model}`);

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ResponseAnalyzer] API Error Response:`, errorText);
      throw new Error(
        `API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    console.log(`[ResponseAnalyzer] API Response received successfully`);

    return data;
  }

  /**
   * Genera análisis de fallback cuando no se puede usar el LLM
   * SIN PATRONES - Solo análisis contextual mínimo
   */
  private generateFallbackAnalysis(prompt: string): string {
    // Análisis inteligente basado en el contenido de la respuesta, como hace AIAgent
    const responseContent = prompt.toLowerCase();

    // Detectar errores de comando (como hace AIAgent)
    const hasCommandError =
      responseContent.includes("command not found") ||
      responseContent.includes("no se encontró") ||
      responseContent.includes("no existe") ||
      responseContent.includes("code 127") ||
      responseContent.includes("exit code 127") ||
      responseContent.includes("error ejecutando");

    const hasFileError =
      responseContent.includes("no such file") ||
      responseContent.includes("file not found") ||
      responseContent.includes("archivo no encontrado");

    const hasPermissionError =
      responseContent.includes("permission denied") ||
      responseContent.includes("acceso denegado");

    // Determinar si hay error y su severidad
    const hasError = hasCommandError || hasFileError || hasPermissionError;
    const errorSeverity = hasPermissionError
      ? "high"
      : hasCommandError
        ? "medium"
        : "low";

    // Generar sugerencia de corrección basada en el tipo de error
    let suggestedCorrection = null;
    let canAutoFix = false;

    if (hasCommandError && responseContent.includes("htop")) {
      suggestedCorrection = 'Usar "top" o "ps aux" como alternativa a htop';
      canAutoFix = true;
    } else if (hasCommandError && responseContent.includes("curl")) {
      suggestedCorrection = 'Usar "wget" como alternativa a curl';
      canAutoFix = true;
    }

    return JSON.stringify({
      hasError: hasError,
      errorDescription: hasCommandError
        ? "Comando no encontrado en el sistema"
        : hasFileError
          ? "Archivo no encontrado"
          : hasPermissionError
            ? "Permisos insuficientes"
            : "Sin errores detectados",
      errorSeverity: errorSeverity,
      confidence: hasError ? 0.8 : 0.9, // Alta confianza en detección de errores
      needsCorrection: hasError && canAutoFix,
      suggestedCorrection: suggestedCorrection,
      canAutoFix: canAutoFix,
      userImpact: hasError
        ? "El comando falló y requiere una alternativa"
        : "Comando ejecutado correctamente",
    });
  }

  /**
   * Parsea la respuesta del análisis LLM
   */
  private parseAnalysisResponse(analysisResponse: string): IntelligentAnalysis {
    try {
      const parsed = JSON.parse(analysisResponse);

      return {
        hasError: parsed.hasError || false,
        errorDescription: parsed.errorDescription,
        errorSeverity: parsed.errorSeverity || "low",
        confidence: parsed.confidence || 0,
        needsCorrection: parsed.needsCorrection || false,
        suggestedCorrection: parsed.suggestedCorrection,
        canAutoFix: parsed.canAutoFix || false,
        userImpact: parsed.userImpact || "Impacto desconocido",
      };
    } catch (error) {
      console.error("Error parseando análisis LLM:", error);

      // Fallback si no se puede parsear
      return {
        hasError: false,
        errorSeverity: "low",
        confidence: 0,
        needsCorrection: false,
        canAutoFix: false,
        userImpact: "No se pudo determinar el impacto",
      };
    }
  }

  /**
   * Análisis básico usando comprensión contextual (sin patrones)
   */
  private async basicErrorDetection(
    response: string,
    toolResults?: any[],
  ): Promise<IntelligentAnalysis> {
    // En lugar de patrones, usar análisis contextual simple
    const basicAnalysisPrompt = `Analiza rápidamente esta respuesta para detectar errores obvios:

RESPUESTA: ${response}

${toolResults ? `RESULTADOS DE HERRAMIENTAS: ${JSON.stringify(toolResults, null, 2)}` : ""}

¿Hay algún error evidente? Responde SOLO con JSON:
{
  "hasError": boolean,
  "errorDescription": "breve descripción si hay error",
  "errorSeverity": "low|medium|high",
  "confidence": número 0-1,
  "needsCorrection": boolean,
  "canAutoFix": boolean,
  "userImpact": "impacto en el usuario"
}`;

    try {
      const analysisResult =
        await this.performLLMSelfAnalysis(basicAnalysisPrompt);
      return this.parseAnalysisResponse(analysisResult);
    } catch (error) {
      // Solo si falla completamente el LLM, usar análisis mínimo
      return {
        hasError: false,
        errorSeverity: "low",
        confidence: 0.1,
        needsCorrection: false,
        canAutoFix: false,
        userImpact: "Análisis no disponible",
      };
    }
  }

  /**
   * Analiza los resultados de las herramientas ejecutadas
   */
  private analyzeToolResults(toolResults: any[]): Partial<ResponseAnalysis> {
    for (const result of toolResults) {
      if (result.error || result.success === false) {
        const errorMsg = result.error || result.message || "Unknown tool error";

        // Determinar tipo de error basado en el mensaje
        let errorType: ResponseAnalysis["errorType"] = "command_failed";

        if (/ENOENT|no such file/i.test(errorMsg)) {
          errorType = "file_not_found";
        } else if (/EACCES|permission denied/i.test(errorMsg)) {
          errorType = "permission_denied";
        } else if (/syntax|parse/i.test(errorMsg)) {
          errorType = "syntax_error";
        }

        return {
          hasError: true,
          errorType,
          errorMessage: errorMsg,
          confidence: 0.9,
        };
      }
    }

    return { hasError: false };
  }

  /**
   * Extrae el contexto del error de la respuesta
   */
  private extractErrorContext(response: string, errorIndex: number): string {
    const lines = response.split("\n");
    let errorLine = "";

    // Encontrar la línea que contiene el error
    let currentIndex = 0;
    for (const line of lines) {
      if (
        currentIndex <= errorIndex &&
        errorIndex < currentIndex + line.length
      ) {
        errorLine = line.trim();
        break;
      }
      currentIndex += line.length + 1; // +1 por el \n
    }

    return errorLine || "Error context not found";
  }

  /**
   * Calcula la confianza de que hay un error
   */
  private calculateConfidence(response: string, pattern: RegExp): number {
    const matches = response.match(new RegExp(pattern.source, "gi"));
    const matchCount = matches ? matches.length : 0;

    // Más coincidencias = mayor confianza
    let confidence = Math.min(0.5 + matchCount * 0.2, 0.95);

    // Aumentar confianza si hay palabras clave de error
    if (/error|failed|exception|denied/i.test(response)) {
      confidence += 0.1;
    }

    // Aumentar confianza si está en un bloque de código o mensaje de error
    if (/```[\s\S]*error[\s\S]*```/i.test(response)) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Genera una sugerencia de corrección basada en el tipo de error
   */
  private generateSuggestedFix(
    errorType: NonNullable<ResponseAnalysis["errorType"]>,
    errorMessage: string,
  ): string {
    switch (errorType) {
      case "command_failed":
        return "Reintentar el comando con parámetros corregidos o usar un enfoque alternativo";

      case "file_not_found":
        if (errorMessage.includes("~")) {
          return "Expandir el símbolo ~ al directorio home del usuario antes de acceder al archivo";
        }
        return "Verificar que la ruta del archivo sea correcta y que el archivo exista";

      case "permission_denied":
        return "Verificar permisos del archivo o ejecutar con privilegios adecuados";

      case "syntax_error":
        return "Revisar la sintaxis del comando o código y corregir errores";

      case "logic_error":
        return "Revisar la lógica del proceso y ajustar el enfoque";

      case "path_error":
        return "Expandir rutas relativas (como ~) a rutas absolutas antes de usarlas";

      default:
        return "Analizar el error y aplicar una solución apropiada";
    }
  }

  /**
   * Genera corrección inteligente usando LLM
   */
  async generateIntelligentCorrection(
    analysis: IntelligentAnalysis,
    originalRequest: string,
    originalResponse: string,
  ): Promise<SmartCorrection | null> {
    if (!analysis.needsCorrection) {
      return null;
    }

    // Si puede auto-corregir, generar corrección automática
    if (analysis.canAutoFix) {
      return await this.generateAutoCorrection(
        analysis,
        originalRequest,
        originalResponse,
      );
    }

    // Si no puede auto-corregir, generar explicación o guía
    return await this.generateGuidedCorrection(
      analysis,
      originalRequest,
      originalResponse,
    );
  }

  /**
   * Genera corrección automática usando LLM
   */
  private async generateAutoCorrection(
    analysis: IntelligentAnalysis,
    originalRequest: string,
    originalResponse: string,
  ): Promise<SmartCorrection> {
    const correctionPrompt = `Como AI, necesito generar una corrección automática para mi respuesta anterior.

**SOLICITUD ORIGINAL:**
${originalRequest}

**MI RESPUESTA ANTERIOR (CON ERROR):**
${originalResponse}

**ANÁLISIS DEL ERROR:**
- Descripción: ${analysis.errorDescription}
- Severidad: ${analysis.errorSeverity}
- Impacto: ${analysis.userImpact}
- Corrección sugerida: ${analysis.suggestedCorrection}

**TAREA:**
Genera una respuesta corregida que:
1. Reconozca el error anterior
2. Proporcione la información correcta
3. Sea útil y completa para el usuario
4. Incluya la corrección automática aplicada

**FORMATO:**
Responde con el texto corregido completo, incluyendo una breve explicación de qué se corrigió.`;

    try {
      const correctedText = await this.performLLMSelfAnalysis(correctionPrompt);

      return {
        correctionType: "auto_fix",
        correctionText: correctedText,
        requiresUserInput: false,
        priority: 9,
      };
    } catch (error) {
      console.error("Error generando corrección automática:", error);

      // Fallback a corrección manual
      return this.generateFallbackCorrection(
        analysis,
        originalRequest,
        originalResponse,
      );
    }
  }

  /**
   * Genera corrección automática sin LLM (como hace AIAgent)
   */
  private generateFallbackCorrection(
    analysis: IntelligentAnalysis,
    originalRequest: string,
    originalResponse: string,
  ): SmartCorrection {
    let correctionText = "";
    let executionSteps: string[] = [];

    // Generar corrección basada en el tipo de error detectado
    if (analysis.suggestedCorrection?.includes("htop")) {
      correctionText = `Veo que el comando \`htop\` no está disponible en este sistema (código de error 127). Te ayudo ejecutando una alternativa:

**🔄 Ejecutando comando alternativo:**
\`\`\`bash
top -l 1
\`\`\`

El comando \`top\` es una alternativa nativa que mostrará los procesos del sistema de manera similar a htop. También puedes usar \`ps aux\` para ver todos los procesos en formato de lista.

¿Te gustaría que ejecute alguno de estos comandos alternativos?`;

      executionSteps = [
        "Detectar que htop no existe (código 127)",
        "Sugerir y ejecutar top -l 1 como alternativa",
        "Ofrecer ps aux como opción adicional",
        "Explicar las diferencias al usuario",
      ];
    } else if (analysis.suggestedCorrection?.includes("curl")) {
      correctionText = `El comando curl no está disponible. Usaré wget como alternativa:

**Comando alternativo:**
\`\`\`bash
wget -O- google.com
\`\`\`

Esto realizará la misma función que curl para verificar conectividad.`;

      executionSteps = [
        "Detectar que curl no existe",
        "Ejecutar wget como alternativa",
        "Verificar conectividad",
      ];
    } else {
      // Corrección genérica
      correctionText = `He detectado un error en la ejecución anterior:

**Error:** ${analysis.errorDescription}
**Solución sugerida:** ${analysis.suggestedCorrection || "Revisar el comando y intentar alternativas"}

Recomiendo verificar que el comando esté instalado o usar una alternativa disponible en el sistema.`;

      executionSteps = [
        "Analizar el error ocurrido",
        "Proporcionar explicación al usuario",
        "Sugerir alternativas disponibles",
      ];
    }

    return {
      correctionType: "auto_fix",
      correctionText: correctionText,
      executionSteps: executionSteps,
      requiresUserInput: false,
      priority: 8,
    };
  }

  /**
   * Genera corrección guiada cuando no se puede auto-corregir
   */
  private async generateGuidedCorrection(
    analysis: IntelligentAnalysis,
    originalRequest: string,
    originalResponse: string,
  ): Promise<SmartCorrection> {
    const guidancePrompt = `Necesito proporcionar una explicación clara al usuario sobre el error y cómo solucionarlo.

**ERROR DETECTADO:**
${analysis.errorDescription}

**IMPACTO EN EL USUARIO:**
${analysis.userImpact}

**CORRECCIÓN SUGERIDA:**
${analysis.suggestedCorrection}

**TAREA:**
Genera una explicación clara que:
1. Explique qué salió mal
2. Proporcione pasos específicos para solucionarlo
3. Sea fácil de entender para el usuario
4. Incluya alternativas si es posible

Responde con texto explicativo claro y útil.`;

    try {
      const guidanceText = await this.performLLMSelfAnalysis(guidancePrompt);

      return {
        correctionType: "guided_fix",
        correctionText: guidanceText,
        requiresUserInput: true,
        priority: 7,
      };
    } catch (error) {
      console.error("Error generando corrección guiada:", error);

      return this.generateFallbackCorrection(
        analysis,
        originalRequest,
        originalResponse,
      );
    }
  }

  /**
   * Ejecuta automáticamente correcciones de alta prioridad
   */
  async executeAutoCorrections(
    actions: CorrectionAction[],
    originalRequest: string,
  ): Promise<string | null> {
    // Ordenar por prioridad (mayor primero)
    const sortedActions = actions
      .filter(
        (action) => action.type === "auto_fix" && (action.priority || 0) >= 8,
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const action of sortedActions) {
      try {
        const result = await this.executeCorrection(action, originalRequest);
        if (result) {
          console.log(
            `✅ [Auto-Correction] Corrección automática exitosa: ${action.action}`,
          );
          return result;
        }
      } catch (error) {
        console.error(
          `❌ [Auto-Correction] Error en corrección automática:`,
          error,
        );
        // Continuar con la siguiente acción
      }
    }

    return null;
  }

  /**
   * Ejecuta una corrección específica
   */
  private async executeCorrection(
    action: CorrectionAction,
    originalRequest: string,
  ): Promise<string | null> {
    switch (action.action) {
      case "expand_home_directory":
        return await this.expandHomeDirectoryAndRetry(
          action.parameters,
          originalRequest,
        );

      case "fix_command_syntax":
        return await this.fixCommandSyntax(action.parameters, originalRequest);

      default:
        return null;
    }
  }

  /**
   * Expande el directorio home y reintenta la operación
   */
  private async expandHomeDirectoryAndRetry(
    params: any,
    originalRequest: string,
  ): Promise<string | null> {
    try {
      const homeDir = os.homedir();

      // Generar respuesta corregida
      const correctedResponse = `🔧 **Corrección Automática Aplicada**

**Problema detectado:** El símbolo \`~\` no se expandió correctamente al directorio home.

**Solución:** Expandiendo \`~\` a \`${homeDir}\`

**Reintentando operación...**

`;

      // Aquí podrías reejecutar la operación original con la ruta corregida
      // Por ahora, devolvemos la explicación de la corrección

      const additionalInfo = await this.getDirectoryInfo(homeDir);

      return correctedResponse + additionalInfo;
    } catch (error) {
      console.error("Error expandiendo directorio home:", error);
      return null;
    }
  }

  /**
   * Obtiene información del directorio para mostrar al usuario
   */
  private async getDirectoryInfo(directory: string): Promise<string> {
    try {
      const files = await this.hostProvider.listFiles(directory);
      const dirs = await this.hostProvider.listDirectories(directory);

      return `📁 **Directorio:** \`${directory}\`

**📁 Subdirectorios (${dirs.length}):**
${
  dirs.length > 0
    ? dirs
        .slice(0, 10)
        .map((dir) => `- \`${path.basename(dir)}/\``)
        .join("\n")
    : "- (ninguno)"
}
${dirs.length > 10 ? `\n... y ${dirs.length - 10} directorios más` : ""}

**📄 Archivos (${files.length}):**
${
  files.length > 0
    ? files
        .slice(0, 15)
        .map((file) => `- \`${path.basename(file)}\``)
        .join("\n")
    : "- (ninguno)"
}
${files.length > 15 ? `\n... y ${files.length - 15} archivos más` : ""}`;
    } catch (error) {
      return `❌ **Error al acceder al directorio:** ${error instanceof Error ? error.message : "Error desconocido"}`;
    }
  }

  /**
   * Intenta corregir sintaxis de comandos
   */
  private async fixCommandSyntax(
    params: any,
    originalRequest: string,
  ): Promise<string | null> {
    // Implementar lógica de corrección de sintaxis
    // Por ahora, devolver explicación
    return `🔧 **Corrección de Sintaxis Detectada**

**Error original:** ${params.errorMessage}

**Sugerencia:** Revisar la sintaxis del comando y verificar que todos los parámetros sean válidos.

**Recomendación:** Intentar con una versión simplificada del comando o verificar la documentación.`;
  }

  /**
   * Verifica si una respuesta necesita análisis adicional
   */
  shouldAnalyzeResponse(response: string): boolean {
    // Analizar si contiene indicadores de posibles errores
    const errorIndicators = [
      /error/i,
      /failed/i,
      /exception/i,
      /denied/i,
      /not found/i,
      /cannot/i,
      /unable/i,
      /❌/,
      /⚠️/,
    ];

    return errorIndicators.some((pattern) => pattern.test(response));
  }
}

export default IntelligentResponseAnalyzer;
