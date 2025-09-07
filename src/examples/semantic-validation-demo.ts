/**
 * Demostración del Sistema de Validación Semántica de Comandos
 *
 * Este ejemplo muestra cómo el sistema detecta comandos peligrosos
 * usando comprensión semántica por LLM, no patrones.
 */

import { SemanticCommandValidator, ValidationContext } from "../core/ai/SemanticCommandValidator";
import { ElectronHostProvider } from "../host/ElectronHostProvider";

export class SemanticValidationDemo {
  private validator: SemanticCommandValidator;

  constructor() {
    // Configuración de ejemplo para el validador
    const mockHostProvider = {} as ElectronHostProvider;
    const aiConfig = {
      model: "claude-3-sonnet",
      apiKey: "demo",
      maxTokens: 4096,
      temperature: 0.1
    };

    this.validator = new SemanticCommandValidator(mockHostProvider, aiConfig);
  }

  /**
   * Ejecuta una demostración completa del sistema
   */
  async runDemo(): Promise<void> {
    console.log("🚀 DEMOSTRACIÓN: Sistema de Validación Semántica de Comandos");
    console.log("=" .repeat(60));

    // Casos de prueba que demuestran la comprensión semántica
    const testCases = [
      // Comandos SEGUROS
      {
        command: "ls -la",
        description: "Listar archivos - SEGURO",
        expectedRisk: "none"
      },
      {
        command: "pwd",
        description: "Mostrar directorio actual - SEGURO",
        expectedRisk: "none"
      },
      {
        command: "cat package.json",
        description: "Leer archivo - SEGURO",
        expectedRisk: "none"
      },

      // Comandos de LIMPIEZA (riesgo medio)
      {
        command: "rm temp.txt",
        description: "Borrar archivo temporal - RIESGO BAJO",
        expectedRisk: "low"
      },
      {
        command: "docker system prune",
        description: "Limpiar Docker - RIESGO MEDIO",
        expectedRisk: "medium"
      },
      {
        command: "find . -name '*.log' -delete",
        description: "Borrar archivos de log - RIESGO MEDIO",
        expectedRisk: "medium"
      },

      // Comandos PELIGROSOS (riesgo alto/crítico)
      {
        command: "rm -rf node_modules",
        description: "Borrar dependencias - RIESGO ALTO",
        expectedRisk: "high"
      },
      {
        command: "git reset --hard HEAD~10",
        description: "Descartar commits - RIESGO ALTO",
        expectedRisk: "high"
      },
      {
        command: "rm -rf /",
        description: "DESTRUIR SISTEMA - RIESGO CRÍTICO",
        expectedRisk: "critical"
      },
      {
        command: "dd if=/dev/zero of=/dev/sda",
        description: "Borrar disco - RIESGO CRÍTICO",
        expectedRisk: "critical"
      }
    ];

    // Ejecutar análisis para cada caso
    for (const testCase of testCases) {
      await this.analyzeCommand(testCase);
      console.log("-".repeat(60));
    }

    console.log("✅ Demostración completada");
  }

  /**
   * Analiza un comando específico y muestra los resultados
   */
  private async analyzeCommand(testCase: {
    command: string;
    description: string;
    expectedRisk: string;
  }): Promise<void> {
    console.log(`\n🔍 ANALIZANDO: ${testCase.description}`);
    console.log(`📝 Comando: ${testCase.command}`);
    console.log(`🎯 Riesgo esperado: ${testCase.expectedRisk.toUpperCase()}`);

    try {
      const context: ValidationContext = {
        command: testCase.command,
        workingDirectory: "/home/user/project",
        userContext: "Comando ejecutado en demostración",
        previousCommands: ["cd project", "npm install"]
      };

      // Realizar análisis semántico
      const analysis = await this.validator.analyzeCommand(context);

      // Mostrar resultados
      console.log(`🧠 ANÁLISIS DEL LLM:`);
      console.log(`   ¿Podría borrar datos?: ${analysis.couldDeleteData ? '❌ SÍ' : '✅ NO'}`);
      console.log(`   Nivel de riesgo: ${this.getRiskEmoji(analysis.riskLevel)} ${analysis.riskLevel.toUpperCase()}`);
      console.log(`   Confianza: ${Math.round(analysis.confidence * 100)}%`);
      console.log(`   Reversible: ${analysis.isReversible ? '✅ Sí' : '❌ No'}`);
      console.log(`   Datos en riesgo: ${analysis.affectedDataTypes.join(', ')}`);
      console.log(`   Explicación: ${analysis.riskExplanation}`);
      console.log(`   Recomendación: ${analysis.recommendation}`);

      // Verificar si requiere confirmación forzada
      const shouldForceConfirmation = this.validator.shouldForceConfirmation(analysis);
      console.log(`🚨 ¿Forzar confirmación?: ${shouldForceConfirmation ? '❌ SÍ' : '✅ NO'}`);

      if (shouldForceConfirmation) {
        console.log(`📋 MENSAJE DE CONFIRMACIÓN:`);
        const confirmationMessage = this.validator.generateConfirmationMessage(
          testCase.command,
          analysis
        );
        console.log(confirmationMessage);
      }

    } catch (error) {
      console.error(`❌ Error analizando comando:`, error);
    }
  }

  /**
   * Obtiene emoji apropiado para el nivel de riesgo
   */
  private getRiskEmoji(riskLevel: string): string {
    const emojis: Record<string, string> = {
      "none": "✅",
      "low": "⚠️",
      "medium": "🚨",
      "high": "🔥",
      "critical": "💀"
    };
    return emojis[riskLevel] || "❓";
  }

  /**
   * Demuestra casos específicos de comprensión semántica
   */
  async demonstrateSemanticUnderstanding(): Promise<void> {
    console.log("\n🧠 DEMOSTRACIÓN: Comprensión Semántica vs Patrones");
    console.log("=" .repeat(60));

    const semanticCases = [
      {
        command: "remove all temporary files from cache directory",
        description: "Comando en inglés natural - el LLM entiende la INTENCIÓN"
      },
      {
        command: "eliminar todos los archivos de configuración",
        description: "Comando en español natural - comprensión multiidioma"
      },
      {
        command: "clean up old log files older than 30 days",
        description: "Descripción compleja - el LLM entiende el CONTEXTO"
      },
      {
        command: "backup database before deleting old records",
        description: "Comando con contexto de seguridad - análisis contextual"
      }
    ];

    console.log("🎯 ESTOS CASOS DEMUESTRAN QUE:");
    console.log("   ✅ El LLM entiende INTENCIÓN, no solo palabras");
    console.log("   ✅ Funciona en múltiples idiomas");
    console.log("   ✅ Considera el CONTEXTO completo");
    console.log("   ✅ No se basa en patrones rígidos");
    console.log("   ❌ Los sistemas basados en regex FALLARÍAN");

    for (const semanticCase of semanticCases) {
      console.log(`\n📝 ${semanticCase.description}`);
      console.log(`🔍 "${semanticCase.command}"`);
      console.log(`🧠 El LLM analizaría la intención semántica de este comando...`);
    }
  }
}

/**
 * Función principal para ejecutar la demostración
 */
export async function runSemanticValidationDemo(): Promise<void> {
  const demo = new SemanticValidationDemo();

  try {
    await demo.runDemo();
    await demo.demonstrateSemanticUnderstanding();
  } catch (error) {
    console.error("❌ Error en la demostración:", error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runSemanticValidationDemo().catch(console.error);
}
