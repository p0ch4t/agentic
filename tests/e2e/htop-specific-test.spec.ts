import { test, expect } from "../helpers/electron-app";

/**
 * Prueba específica para htop -b -n 1
 * Evalúa si el sistema puede:
 * - Intentar ejecutar htop -b -n 1
 * - Reconocer que htop no existe en el sistema
 * - Sugerir alternativas como top o ps
 * - Ejecutar la alternativa automáticamente
 */
test.describe("Prueba Específica: htop -b -n 1", () => {
  async function sendCommandAndWaitForResponse(
    electronApp: any,
    command: string,
    timeout: number = 45000,
  ) {
    const messageInput = electronApp.page.locator("#messageInput");
    const sendButton = electronApp.page.locator("#sendBtn");

    await messageInput.clear();
    await messageInput.fill(command);
    await sendButton.click();

    // Esperar a que aparezca la sección de chat
    await electronApp.page.waitForSelector("#chatSection:not(.hidden)", {
      timeout: 5000,
    });

    // Esperar respuesta completa
    await electronApp.page.waitForTimeout(timeout);

    const chatContent = await electronApp.page.textContent("#chatMessages");
    return chatContent || "";
  }

  test("debería ejecutar htop -b -n 1 y reconocer que no existe", async ({
    electronApp,
  }) => {
    console.log("🎯 Probando comando específico: htop -b -n 1");

    const htopCommand = "Ejecuta este comando exacto: htop -b -n 1";
    const response = await sendCommandAndWaitForResponse(
      electronApp,
      htopCommand,
      30000,
    );

    console.log("📝 Longitud de respuesta:", response.length);
    console.log("📄 RESPUESTA COMPLETA:");
    console.log("=".repeat(80));
    console.log(response);
    console.log("=".repeat(80));

    // Análisis detallado de la respuesta
    const analysis = {
      // Menciona el comando solicitado
      mentionsHtop: response.toLowerCase().includes("htop"),
      mentionsSpecificFlags:
        response.toLowerCase().includes("-b") &&
        response.toLowerCase().includes("-n 1"),

      // Detecta que no existe
      recognizesCommandNotFound:
        response.toLowerCase().includes("command not found") ||
        response.toLowerCase().includes("no se encontró") ||
        response.toLowerCase().includes("no existe") ||
        response.toLowerCase().includes("not recognized") ||
        response.toLowerCase().includes("no está instalado") ||
        response.toLowerCase().includes("no such file"),

      // Muestra error o problema
      showsError:
        response.toLowerCase().includes("error") ||
        response.toLowerCase().includes("fallo") ||
        response.toLowerCase().includes("problema"),

      // Sugiere alternativas
      suggestsTop: response.toLowerCase().includes("top"),
      suggestsPs: response.toLowerCase().includes("ps"),
      suggestsActivityMonitor: response
        .toLowerCase()
        .includes("activity monitor"),

      // Comportamiento reflexivo
      showsReflection:
        response.toLowerCase().includes("veo que") ||
        response.toLowerCase().includes("parece que") ||
        response.toLowerCase().includes("me doy cuenta") ||
        response.toLowerCase().includes("observo que") ||
        response.toLowerCase().includes("intentaré") ||
        response.toLowerCase().includes("alternativamente"),

      // Intenta ejecutar alternativa
      executesAlternative:
        response.includes("top") || response.includes("ps aux"),

      responseLength: response.length,
    };

    console.log("📊 Análisis detallado de htop -b -n 1:", analysis);

    // Verificaciones básicas
    expect(analysis.mentionsHtop).toBeTruthy();
    expect(analysis.responseLength).toBeGreaterThan(200);

    // Debe mostrar algún tipo de comportamiento inteligente
    const showsIntelligentBehavior =
      analysis.recognizesCommandNotFound ||
      analysis.showsError ||
      analysis.suggestsTop ||
      analysis.suggestsPs ||
      analysis.showsReflection;

    console.log(
      "🧠 Muestra comportamiento inteligente:",
      showsIntelligentBehavior,
    );
    expect(showsIntelligentBehavior).toBeTruthy();

    // Log detallado para debugging
    if (analysis.recognizesCommandNotFound) {
      console.log("✅ Reconoce que htop no existe");
    }
    if (analysis.suggestsTop || analysis.suggestsPs) {
      console.log("✅ Sugiere alternativas (top/ps)");
    }
    if (analysis.showsReflection) {
      console.log("✅ Muestra pensamiento reflexivo");
    }
    if (analysis.executesAlternative) {
      console.log("✅ Ejecuta alternativa automáticamente");
    }

    await electronApp.takeScreenshot("htop-comando-especifico");
  });

  test("debería mostrar el flujo completo de auto-corrección", async ({
    electronApp,
  }) => {
    console.log("🔄 Probando flujo completo de auto-corrección con htop...");

    const detailedCommand = `
    Necesito ver los procesos del sistema en tiempo real.
    Ejecuta el comando: htop -b -n 1

    Si no funciona, analiza por qué falló y ejecuta una alternativa que sí funcione.
    `;

    const response = await sendCommandAndWaitForResponse(
      electronApp,
      detailedCommand,
      10000,
    );

    console.log("📝 Longitud de respuesta completa:", response.length);

    // Análisis del flujo completo
    const flowAnalysis = {
      // Fase 1: Intento inicial
      attemptsHtop: response.toLowerCase().includes("htop"),

      // Fase 2: Reconocimiento del problema
      recognizesIssue:
        response.toLowerCase().includes("error") ||
        response.toLowerCase().includes("no existe") ||
        response.toLowerCase().includes("command not found") ||
        response.toLowerCase().includes("no se encontró"),

      // Fase 3: Análisis reflexivo
      analyzesWhy:
        response.toLowerCase().includes("porque") ||
        response.toLowerCase().includes("debido a") ||
        response.toLowerCase().includes("la razón") ||
        response.toLowerCase().includes("el problema"),

      // Fase 4: Propuesta de alternativa
      proposesAlternative:
        response.toLowerCase().includes("alternativa") ||
        response.toLowerCase().includes("en su lugar") ||
        response.toLowerCase().includes("puedo usar") ||
        response.toLowerCase().includes("intentaré"),

      // Fase 5: Ejecución de alternativa
      executesWorking:
        response.includes("top") ||
        response.includes("ps") ||
        response.includes("activity monitor"),

      responseLength: response.length,
    };

    console.log("🔍 Análisis del flujo completo:", flowAnalysis);

    // Verificar que muestra un flujo inteligente
    expect(flowAnalysis.attemptsHtop).toBeTruthy();
    expect(flowAnalysis.responseLength).toBeGreaterThan(500);

    // Debe mostrar al menos 3 de las 5 fases del flujo inteligente
    const completedPhases = [
      flowAnalysis.attemptsHtop,
      flowAnalysis.recognizesIssue,
      flowAnalysis.analyzesWhy,
      flowAnalysis.proposesAlternative,
      flowAnalysis.executesWorking,
    ].filter(Boolean).length;

    console.log(`📈 Fases completadas: ${completedPhases}/5`);
    expect(completedPhases).toBeGreaterThanOrEqual(3);

    await electronApp.takeScreenshot("flujo-completo-htop");
  });

  test("debería comparar htop vs top y explicar las diferencias", async ({
    electronApp,
  }) => {
    console.log("🔍 Probando análisis comparativo htop vs top...");

    const comparativeCommand = `
    Ejecuta htop -b -n 1 y luego explícame las diferencias entre htop y top.
    `;

    const response = await sendCommandAndWaitForResponse(
      electronApp,
      comparativeCommand,
      10000,
    );

    const comparativeAnalysis = {
      mentionsHtop: response.toLowerCase().includes("htop"),
      mentionsTop: response.toLowerCase().includes("top"),
      explainsDifferences:
        response.toLowerCase().includes("diferencia") ||
        response.toLowerCase().includes("comparación") ||
        response.toLowerCase().includes("vs") ||
        response.toLowerCase().includes("mientras que"),
      showsUnderstanding:
        response.toLowerCase().includes("interactivo") ||
        response.toLowerCase().includes("colores") ||
        response.toLowerCase().includes("más fácil") ||
        response.toLowerCase().includes("interfaz"),
      providesContext:
        response.toLowerCase().includes("instalar") ||
        response.toLowerCase().includes("disponible") ||
        response.toLowerCase().includes("por defecto"),
      responseLength: response.length,
    };

    console.log("📊 Análisis comparativo:", comparativeAnalysis);

    expect(
      comparativeAnalysis.mentionsHtop && comparativeAnalysis.mentionsTop,
    ).toBeTruthy();
    expect(comparativeAnalysis.responseLength).toBeGreaterThan(300);

    // Debe mostrar comprensión de las diferencias
    const showsDeepUnderstanding =
      comparativeAnalysis.explainsDifferences ||
      comparativeAnalysis.showsUnderstanding;
    expect(showsDeepUnderstanding).toBeTruthy();

    await electronApp.takeScreenshot("comparacion-htop-top");
  });
});
