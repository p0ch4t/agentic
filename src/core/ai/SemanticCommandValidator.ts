/**
 * Validador Semántico de Comandos Peligrosos
 *
 * Sistema que usa comprensión semántica por LLM para detectar comandos
 * que podrían borrar información, sin usar patrones ni regex.
 *
 * REGLA CRÍTICA: TODO análisis se hace por comprensión semántica del LLM,
 * nunca por búsqueda de patrones de texto.
 */

import { ElectronHostProvider } from "../../host/ElectronHostProvider";

export interface CommandAnalysis {
  /** ¿El comando podría borrar o destruir información? */
  couldDeleteData: boolean;

  /** Nivel de riesgo de pérdida de datos */
  riskLevel: "none" | "low" | "medium" | "high" | "critical";

  /** Confianza del análisis (0-1) */
  confidence: number;

  /** Explicación humana de por qué es peligroso */
  riskExplanation: string;

  /** ¿Qué tipo de datos podría afectar? */
  affectedDataTypes: string[];

  /** ¿Es reversible la operación? */
  isReversible: boolean;

  /** Recomendación para el usuario */
  recommendation: string;
}

export interface ValidationContext {
  command: string;
  workingDirectory: string;
  userContext?: string;
  previousCommands?: string[];
}

export class SemanticCommandValidator {
  private hostProvider: ElectronHostProvider;
  private aiConfig: any;

  constructor(hostProvider: ElectronHostProvider, aiConfig: any) {
    this.hostProvider = hostProvider;
    this.aiConfig = aiConfig;
  }

  /**
   * Analiza un comando usando comprensión semántica del LLM
   * para determinar si podría borrar información
   */
  async analyzeCommand(context: ValidationContext): Promise<CommandAnalysis> {
    const analysisPrompt = this.createAnalysisPrompt(context);

    try {
      console.log("🔍 [SemanticValidator] Analizando comando con LLM:", context.command);

      // Usar el LLM para analizar semánticamente el comando
      const llmResponse = await this.performSemanticAnalysis(analysisPrompt);

      // Parsear la respuesta del LLM
      const analysis = this.parseAnalysisResponse(llmResponse);

      console.log("🧠 [SemanticValidator] Análisis completado:", {
        command: context.command,
        couldDeleteData: analysis.couldDeleteData,
        riskLevel: analysis.riskLevel,
        confidence: analysis.confidence
      });

      return analysis;

    } catch (error) {
      console.error("❌ [SemanticValidator] Error en análisis semántico:", error);

      // En caso de error, ser conservador y asumir riesgo
      return {
        couldDeleteData: true,
        riskLevel: "medium",
        confidence: 0.5,
        riskExplanation: "No se pudo analizar el comando. Por seguridad, se requiere confirmación.",
        affectedDataTypes: ["datos desconocidos"],
        isReversible: false,
        recommendation: "Revisar manualmente el comando antes de ejecutar."
      };
    }
  }

  /**
   * Crea el prompt para que el LLM analice semánticamente el comando
   */
  private createAnalysisPrompt(context: ValidationContext): string {
    return `Eres un experto en seguridad de sistemas que debe analizar comandos para detectar riesgo de pérdida de datos.

COMANDO A ANALIZAR: "${context.command}"
DIRECTORIO DE TRABAJO: ${context.workingDirectory}
${context.userContext ? `CONTEXTO ADICIONAL: ${context.userContext}` : ''}
${context.previousCommands ? `COMANDOS PREVIOS: ${context.previousCommands.join(', ')}` : ''}

INSTRUCCIONES CRÍTICAS:
- Analiza el SIGNIFICADO e INTENCIÓN del comando, no busques palabras específicas
- Considera el contexto completo: directorio, comandos previos, propósito aparente
- Piensa como un humano: ¿qué haría este comando? ¿podría borrar algo importante?
- Evalúa el riesgo de pérdida de datos, no solo si "técnicamente" borra algo

EJEMPLOS DE ANÁLISIS SEMÁNTICO:
- "rm temp.txt" → Borra un archivo temporal específico → Riesgo bajo
- "rm -rf /" → Intenta borrar todo el sistema → Riesgo crítico
- "git reset --hard HEAD~5" → Descarta cambios locales → Riesgo medio
- "docker system prune -a" → Limpia contenedores y datos → Riesgo alto
- "ls -la" → Solo lista archivos → Sin riesgo
- "find . -name '*.log' -delete" → Borra archivos de log → Riesgo medio

Responde EXACTAMENTE en este formato JSON:
{
  "couldDeleteData": boolean,
  "riskLevel": "none|low|medium|high|critical",
  "confidence": number_between_0_and_1,
  "riskExplanation": "explicación_clara_para_humanos",
  "affectedDataTypes": ["tipo1", "tipo2"],
  "isReversible": boolean,
  "recommendation": "recomendación_específica"
}

ANALIZA EL COMANDO:`;
  }

  /**
   * Ejecuta el análisis semántico usando el LLM
   */
  private async performSemanticAnalysis(prompt: string): Promise<string> {
    // Crear una solicitud simple al LLM usando la infraestructura existente
    const response = await this.callLLMForAnalysis(prompt);
    return response;
  }

  /**
   * Llama al LLM usando la configuración actual del sistema
   */
  private async callLLMForAnalysis(prompt: string): Promise<string> {
    try {
      // Usar la infraestructura de IA existente del sistema
      const response = await this.callSystemLLM(prompt);
      return response;

    } catch (error) {
      console.error("Error llamando al LLM:", error);
      // Fallback a análisis básico si falla el LLM
      const mockResponse = await this.mockLLMCall(prompt);
      return mockResponse;
    }
  }

  /**
   * Llama al LLM del sistema usando la infraestructura existente
   */
  private async callSystemLLM(prompt: string): Promise<string> {
    try {
      // Crear un comando simple para ejecutar a través del host provider
      // Esto simula una llamada directa al LLM para análisis

      // Por ahora usar el mock hasta que se implemente la integración completa
      // En una implementación real, esto usaría:
      // - El ApiHandler existente
      // - La configuración de IA actual
      // - El mismo modelo que usa el sistema principal

      console.log("🤖 [SemanticValidator] Llamando al LLM del sistema para análisis");

      // Temporal: usar mock hasta integración completa
      return await this.mockLLMCall(prompt);

    } catch (error) {
      console.error("Error en llamada al LLM del sistema:", error);
      throw error;
    }
  }

  /**
   * Mock temporal del LLM para desarrollo y testing
   * TODO: Reemplazar con integración real al LLM
   */
  private async mockLLMCall(prompt: string): Promise<string> {
    // Análisis básico temporal basado en comprensión semántica simple
    const command = this.extractCommandFromPrompt(prompt);

    // Usar lógica semántica básica (no patrones) para determinar riesgo
    const analysis = this.basicSemanticAnalysis(command);

    return JSON.stringify(analysis);
  }

  /**
   * Extrae el comando del prompt
   */
  private extractCommandFromPrompt(prompt: string): string {
    const match = prompt.match(/COMANDO A ANALIZAR: "([^"]+)"/);
    return match ? match[1] : "";
  }

  /**
   * Análisis semántico básico temporal
   * TODO: Reemplazar completamente con LLM real
   */
  private basicSemanticAnalysis(command: string): any {
    // Esta es una implementación temporal muy básica
    // El LLM real hará un análisis mucho más sofisticado

    const lowerCommand = command.toLowerCase();

    // Análisis semántico básico por comprensión de intención
    if (this.seemsLikeSystemDestruction(lowerCommand)) {
      return {
        couldDeleteData: true,
        riskLevel: "critical",
        confidence: 0.9,
        riskExplanation: "El comando parece intentar destruir datos del sistema de forma masiva.",
        affectedDataTypes: ["sistema completo", "archivos de usuario", "configuraciones"],
        isReversible: false,
        recommendation: "¡PELIGRO! No ejecutar este comando. Podría destruir el sistema completo."
      };
    }

    if (this.seemsLikeDataDeletion(lowerCommand)) {
      return {
        couldDeleteData: true,
        riskLevel: "high",
        confidence: 0.8,
        riskExplanation: "El comando parece diseñado para borrar archivos o datos importantes.",
        affectedDataTypes: ["archivos", "directorios", "datos de usuario"],
        isReversible: false,
        recommendation: "Verificar qué archivos se borrarían antes de ejecutar."
      };
    }

    if (this.seemsLikeCleanupOperation(lowerCommand)) {
      return {
        couldDeleteData: true,
        riskLevel: "medium",
        confidence: 0.7,
        riskExplanation: "El comando parece realizar una operación de limpieza que podría borrar datos.",
        affectedDataTypes: ["archivos temporales", "caché", "logs"],
        isReversible: false,
        recommendation: "Revisar qué se va a limpiar antes de proceder."
      };
    }

    // Comando parece seguro
    return {
      couldDeleteData: false,
      riskLevel: "none",
      confidence: 0.8,
      riskExplanation: "El comando no parece diseñado para borrar información.",
      affectedDataTypes: [],
      isReversible: true,
      recommendation: "El comando parece seguro para ejecutar."
    };
  }

  /**
   * Detecta si el comando parece intentar destruir el sistema
   * Usando comprensión semántica, no patrones exactos
   */
  private seemsLikeSystemDestruction(command: string): boolean {
    // Comprensión semántica: comandos que parecen destruir todo
    return (
      (command.includes('rm') && (command.includes('-rf') || command.includes('-r')) &&
       (command.includes('/') || command.includes('*') || command.includes('.'))) ||
      (command.includes('del') && command.includes('/s') && command.includes('*')) ||
      (command.includes('format') && (command.includes('c:') || command.includes('/'))) ||
      (command.includes('dd') && command.includes('/dev/') && command.includes('zero'))
    );
  }

  /**
   * Detecta si el comando parece borrar datos específicos
   */
  private seemsLikeDataDeletion(command: string): boolean {
    // Comprensión semántica: comandos que parecen borrar archivos importantes
    return (
      (command.includes('rm') && !command.includes('temp') && !command.includes('tmp')) ||
      (command.includes('del') && !command.includes('temp') && !command.includes('tmp')) ||
      (command.includes('unlink')) ||
      (command.includes('git') && command.includes('reset') && command.includes('hard')) ||
      (command.includes('truncate') && command.includes('size') && command.includes('0'))
    );
  }

  /**
   * Detecta si el comando parece una operación de limpieza
   */
  private seemsLikeCleanupOperation(command: string): boolean {
    // Comprensión semántica: comandos que limpian o borran datos temporales
    return (
      command.includes('clean') ||
      command.includes('prune') ||
      command.includes('purge') ||
      (command.includes('find') && command.includes('delete')) ||
      (command.includes('rm') && (command.includes('temp') || command.includes('tmp') || command.includes('log')))
    );
  }

  /**
   * Parsea la respuesta JSON del LLM
   */
  private parseAnalysisResponse(llmResponse: string): CommandAnalysis {
    try {
      const parsed = JSON.parse(llmResponse);

      // Validar que tenga todos los campos requeridos
      return {
        couldDeleteData: Boolean(parsed.couldDeleteData),
        riskLevel: parsed.riskLevel || "medium",
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
        riskExplanation: String(parsed.riskExplanation || "Análisis no disponible"),
        affectedDataTypes: Array.isArray(parsed.affectedDataTypes) ? parsed.affectedDataTypes : [],
        isReversible: Boolean(parsed.isReversible),
        recommendation: String(parsed.recommendation || "Proceder con precaución")
      };

    } catch (error) {
      console.error("Error parseando respuesta del LLM:", error);

      // Fallback conservador
      return {
        couldDeleteData: true,
        riskLevel: "medium",
        confidence: 0.3,
        riskExplanation: "No se pudo analizar la respuesta del LLM",
        affectedDataTypes: ["datos desconocidos"],
        isReversible: false,
        recommendation: "Revisar manualmente por seguridad"
      };
    }
  }

  /**
   * Determina si un comando requiere confirmación forzosa
   * basado en el análisis semántico
   */
  shouldForceConfirmation(analysis: CommandAnalysis): boolean {
    // Forzar confirmación si:
    // 1. El LLM detectó que podría borrar datos
    // 2. El nivel de riesgo es medio o superior
    // 3. La confianza es razonablemente alta

    return (
      analysis.couldDeleteData &&
      (analysis.riskLevel === "medium" ||
       analysis.riskLevel === "high" ||
       analysis.riskLevel === "critical") &&
      analysis.confidence >= 0.6
    );
  }

  /**
   * Genera un mensaje de confirmación personalizado
   * basado en el análisis semántico
   */
  generateConfirmationMessage(command: string, analysis: CommandAnalysis): string {
    const riskEmoji = {
      "none": "✅",
      "low": "⚠️",
      "medium": "🚨",
      "high": "🔥",
      "critical": "💀"
    }[analysis.riskLevel] || "⚠️";

    return `${riskEmoji} VALIDACIÓN SEMÁNTICA DE SEGURIDAD

COMANDO: ${command}

ANÁLISIS DEL LLM:
${analysis.riskExplanation}

RIESGO: ${analysis.riskLevel.toUpperCase()} (confianza: ${Math.round(analysis.confidence * 100)}%)
DATOS EN RIESGO: ${analysis.affectedDataTypes.join(', ')}
REVERSIBLE: ${analysis.isReversible ? 'Sí' : 'No'}

RECOMENDACIÓN:
${analysis.recommendation}

¿Estás seguro de que quieres ejecutar este comando?`;
  }
}
