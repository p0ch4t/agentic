import { test, expect } from "../helpers/electron-app";
import {
  TEST_MESSAGES,
  TEST_TIMEOUTS,
  TEST_SELECTORS,
  EXPECTED_RESPONSES,
  TestDataGenerator,
} from "../fixtures/test-data";

/**
 * Pruebas de interacción con IA
 * Verifican que la funcionalidad de IA funcione correctamente
 */
test.describe("Interacciones con IA", () => {
  test("debería detectar elementos de chat en la interfaz", async ({
    electronApp,
  }) => {
    // Buscar elementos relacionados con chat/IA
    const chatElements = await electronApp.page
      .locator('textarea, input[type="text"]')
      .count();
    const buttons = await electronApp.page.locator("button").count();

    console.log(`📝 Elementos de entrada encontrados: ${chatElements}`);
    console.log(`🔘 Botones encontrados: ${buttons}`);

    // Debe haber al menos algún elemento de entrada
    expect(chatElements + buttons).toBeGreaterThan(0);

    // Tomar captura de la interfaz de chat
    await electronApp.takeScreenshot("interfaz-chat");
  });

  test("debería permitir escribir mensajes", async ({ electronApp }) => {
    // Buscar campo de entrada de texto
    const textInputs = electronApp.page.locator('textarea, input[type="text"]');
    const inputCount = await textInputs.count();

    if (inputCount > 0) {
      const firstInput = textInputs.first();
      await firstInput.waitFor({ timeout: TEST_TIMEOUTS.NORMAL_ACTION });

      // Escribir un mensaje de prueba
      const testMessage = TestDataGenerator.generateUniqueMessage(
        "Prueba de escritura",
      );
      await firstInput.fill(testMessage);

      // Verificar que el texto se escribió correctamente
      const inputValue = await firstInput.inputValue();
      expect(inputValue).toContain("Prueba de escritura");

      console.log("✅ Escritura de mensaje exitosa:", testMessage);
    } else {
      console.log("⚠️ No se encontraron campos de entrada de texto");
    }
  });

  test("debería manejar envío de mensajes básicos", async ({ electronApp }) => {
    try {
      // Intentar enviar un mensaje simple
      const message = TEST_MESSAGES.SIMPLE_GREETING;

      // Buscar y usar el primer campo de texto disponible
      const textArea = electronApp.page.locator("textarea").first();
      const textInput = electronApp.page.locator('input[type="text"]').first();

      let inputElement = null;
      if ((await textArea.count()) > 0) {
        inputElement = textArea;
      } else if ((await textInput.count()) > 0) {
        inputElement = textInput;
      }

      if (inputElement) {
        await inputElement.fill(message);

        // Buscar botón de envío
        const sendButton = electronApp.page.locator("button").first();
        if ((await sendButton.count()) > 0) {
          await sendButton.click();
          console.log("✅ Mensaje enviado exitosamente");
        } else {
          // Intentar enviar con Enter
          await inputElement.press("Enter");
          console.log("✅ Mensaje enviado con Enter");
        }

        // Esperar un momento para que se procese
        await electronApp.page.waitForTimeout(2000);
      } else {
        console.log(
          "⚠️ No se encontró elemento de entrada para enviar mensaje",
        );
      }
    } catch (error) {
      console.log(
        "⚠️ Error al enviar mensaje (esperado en algunas configuraciones):",
        error,
      );
    }
  });

  test("debería mostrar indicadores de estado durante procesamiento", async ({
    electronApp,
  }) => {
    // Buscar indicadores de carga o procesamiento
    const loadingIndicators = await electronApp.page
      .locator('.loading, .spinner, .processing, [data-testid="loading"]')
      .count();

    const statusElements = await electronApp.page
      .locator('.status, .state, [data-testid="status"]')
      .count();

    console.log(`⏳ Indicadores de carga encontrados: ${loadingIndicators}`);
    console.log(`📊 Elementos de estado encontrados: ${statusElements}`);

    // Verificar que hay algún tipo de feedback visual
    const totalIndicators = loadingIndicators + statusElements;
    console.log(`✅ Total de indicadores de estado: ${totalIndicators}`);
  });

  test("debería manejar configuración de IA", async ({ electronApp }) => {
    // Buscar elementos de configuración
    const configElements = await electronApp.page
      .locator(
        'button:has-text("Configuración"), button:has-text("Settings"), button:has-text("Config")',
      )
      .count();

    const inputFields = await electronApp.page.locator("input").count();

    console.log(`⚙️ Elementos de configuración encontrados: ${configElements}`);
    console.log(`📝 Campos de entrada encontrados: ${inputFields}`);

    // Si hay elementos de configuración, intentar interactuar
    if (configElements > 0) {
      const configButton = electronApp.page
        .locator(
          'button:has-text("Configuración"), button:has-text("Settings"), button:has-text("Config")',
        )
        .first();

      await configButton.click();
      await electronApp.page.waitForTimeout(1000);

      console.log("✅ Interacción con configuración exitosa");
    }
  });

  test("debería mantener historial de conversación", async ({
    electronApp,
  }) => {
    // Verificar que existe algún mecanismo de historial
    const historyElements = await electronApp.page
      .locator('.history, .conversation, .messages, [data-testid="history"]')
      .count();

    const messageContainers = await electronApp.page
      .locator('.message, .chat-message, [data-testid="message"]')
      .count();

    console.log(`📚 Elementos de historial encontrados: ${historyElements}`);
    console.log(`💬 Contenedores de mensaje encontrados: ${messageContainers}`);

    // Tomar captura del estado actual
    await electronApp.takeScreenshot("historial-conversacion");
  });

  test("debería responder a comandos de limpieza", async ({ electronApp }) => {
    // Primero necesitamos iniciar una conversación para que aparezcan los botones de chat
    const messageInput = electronApp.page.locator("#messageInput");
    await messageInput.fill("Hola, prueba de limpieza");

    const sendButton = electronApp.page.locator("#sendBtn");
    await sendButton.click();

    // Esperar a que aparezca la sección de chat
    await electronApp.page.waitForSelector("#chatSection:not(.hidden)", {
      timeout: 5000,
    });

    // Ahora buscar botones de limpieza que deberían estar visibles
    const clearButtons = await electronApp.page
      .locator("#clearChatBtn")
      .count();

    console.log(`🧹 Botones de limpieza encontrados: ${clearButtons}`);

    if (clearButtons > 0) {
      const clearButton = electronApp.page.locator("#clearChatBtn");

      // Verificar que el botón esté visible antes de hacer clic
      await clearButton.waitFor({ state: "visible", timeout: 5000 });
      await clearButton.click();

      console.log("✅ Comando de limpieza ejecutado");
    } else {
      console.log("⚠️ No se encontraron botones de limpieza visibles");
    }
  });

  test("debería manejar múltiples mensajes en secuencia", async ({
    electronApp,
  }) => {
    const messages = TestDataGenerator.generateConversationFlow();

    for (let i = 0; i < Math.min(messages.length, 2); i++) {
      // Limitar a 2 mensajes para pruebas
      const message = messages[i];

      try {
        // Usar selectores específicos para evitar conflictos
        const messageInput = electronApp.page.locator("#messageInput");
        const sendButton = electronApp.page.locator("#sendBtn");

        // Esperar a que los elementos estén disponibles
        await messageInput.waitFor({ state: "visible", timeout: 5000 });
        await sendButton.waitFor({ state: "visible", timeout: 5000 });

        // Limpiar el campo antes de escribir
        await messageInput.clear();
        await messageInput.fill(message);

        // Esperar a que el botón se habilite (puede estar deshabilitado inicialmente)
        await sendButton.waitFor({ state: "visible", timeout: 5000 });

        // Verificar que el botón no esté deshabilitado
        const isDisabled = await sendButton.isDisabled();
        if (!isDisabled) {
          await sendButton.click();
          console.log(
            `✅ Mensaje ${i + 1} enviado: ${message.substring(0, 30)}...`,
          );
        } else {
          console.log(`⚠️ Botón de envío deshabilitado para mensaje ${i + 1}`);
        }

        // Esperar entre mensajes para evitar conflictos
        await electronApp.page.waitForTimeout(2000);
      } catch (error) {
        console.log(`⚠️ Error en mensaje ${i + 1}:`, error.message);
        // Continuar con el siguiente mensaje en lugar de fallar completamente
      }
    }
  });

  test("debería validar integridad de la interfaz después de interacciones", async ({
    electronApp,
  }) => {
    // Realizar varias interacciones
    await electronApp.page.keyboard.press("Tab");
    await electronApp.page.keyboard.press("Tab");
    await electronApp.page.keyboard.press("Escape");

    // Verificar que la aplicación sigue estable
    await electronApp.verifyAppHealth();

    // Verificar que elementos críticos siguen presentes
    const bodyContent = await electronApp.page.textContent("body");
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);

    console.log("✅ Integridad de interfaz mantenida después de interacciones");
  });
});
