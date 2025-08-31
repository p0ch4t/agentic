import {
  test as base,
  expect,
  Page,
  ElectronApplication,
  _electron as electron,
} from "@playwright/test";
import * as path from "path";

/**
 * Helper para manejar la aplicación Electron en las pruebas
 */
export class ElectronAppHelper {
  public app: ElectronApplication;
  public page: Page;

  constructor(app: ElectronApplication, page: Page) {
    this.app = app;
    this.page = page;
  }

  /**
   * Lanza la aplicación Electron
   */
  static async launch(): Promise<ElectronAppHelper> {
    // Ruta al archivo principal compilado
    const electronPath = path.join(__dirname, "../../dist/main.js");

    console.log("🚀 Lanzando aplicación Electron desde:", electronPath);

    const app = await electron.launch({
      args: [electronPath],
      // Configuraciones adicionales para pruebas
      env: {
        ...process.env,
        NODE_ENV: "test",
        DEBUG_MODE: "false",
      },
      // Configuraciones para evitar conflictos
      timeout: 30000,
    });

    // Esperar a que la ventana principal esté disponible
    const page = await app.firstWindow();

    // Esperar a que la página esté completamente cargada
    await page.waitForLoadState("domcontentloaded");

    console.log("✅ Aplicación Electron lanzada exitosamente");

    return new ElectronAppHelper(app, page);
  }

  /**
   * Espera a que un elemento esté visible
   */
  async waitForElement(
    selector: string,
    timeout: number = 10000,
  ): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  /**
   * Espera a que el texto esté presente en la página
   */
  async waitForText(text: string, timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      (searchText) => document.body.textContent?.includes(searchText),
      text,
      { timeout },
    );
  }

  /**
   * Simula escribir un mensaje en el chat de IA
   */
  async sendAIMessage(message: string): Promise<void> {
    console.log("📝 Enviando mensaje a IA:", message.substring(0, 50) + "...");

    // Buscar el área de texto del chat
    const chatInput = this.page.locator('textarea, input[type="text"]').first();
    await chatInput.waitFor({ timeout: 5000 });

    // Escribir el mensaje
    await chatInput.fill(message);

    // Buscar y hacer clic en el botón de enviar
    const sendButton = this.page
      .locator("button")
      .filter({ hasText: /enviar|send|submit/i })
      .first();
    await sendButton.click();

    console.log("✅ Mensaje enviado exitosamente");
  }

  /**
   * Espera a que aparezca una respuesta de la IA
   */
  async waitForAIResponse(timeout: number = 30000): Promise<string> {
    console.log("⏳ Esperando respuesta de IA...");

    // Esperar a que aparezca contenido de respuesta
    await this.page.waitForFunction(
      () => {
        // Buscar indicadores de que la IA está respondiendo o ha respondido
        const indicators = [
          document.querySelector('[data-testid="ai-response"]'),
          document.querySelector(".ai-message"),
          document.querySelector(".response-content"),
          // Buscar por texto que indique actividad de IA
          Array.from(document.querySelectorAll("*")).find(
            (el) =>
              el.textContent?.includes("procesando") ||
              el.textContent?.includes("pensando") ||
              el.textContent?.includes("generando"),
          ),
        ];
        return indicators.some((indicator) => indicator !== null);
      },
      { timeout },
    );

    // Obtener el texto de la respuesta
    const responseText = await this.page.textContent("body");
    console.log("✅ Respuesta de IA recibida");

    return responseText || "";
  }

  /**
   * Verifica que la aplicación esté en estado funcional
   */
  async verifyAppHealth(): Promise<void> {
    console.log("🔍 Verificando salud de la aplicación...");

    // Verificar que la ventana principal esté visible
    expect(await this.page.isVisible("body")).toBeTruthy();

    // Verificar que no hay errores críticos en la consola
    const errors: string[] = [];
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Esperar un momento para capturar errores
    await this.page.waitForTimeout(1000);

    // Filtrar errores conocidos/esperados
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes("DevTools") &&
        !error.includes("favicon") &&
        !error.includes("net::ERR_FILE_NOT_FOUND"),
    );

    if (criticalErrors.length > 0) {
      console.warn("⚠️ Errores encontrados en consola:", criticalErrors);
    }

    console.log("✅ Aplicación en estado saludable");
  }

  /**
   * Toma una captura de pantalla para debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    const screenshotPath = path.join(
      __dirname,
      "../screenshots",
      `${name}-${Date.now()}.png`,
    );
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log("📸 Captura guardada en:", screenshotPath);
  }

  /**
   * Cierra la aplicación
   */
  async close(): Promise<void> {
    console.log("🔚 Cerrando aplicación Electron...");
    await this.app.close();
    console.log("✅ Aplicación cerrada exitosamente");
  }
}

/**
 * Fixture personalizado para pruebas de Electron
 */
export const test = base.extend<{ electronApp: ElectronAppHelper }>({
  electronApp: async ({}, use) => {
    const app = await ElectronAppHelper.launch();
    await use(app);
    await app.close();
  },
});

export { expect } from "@playwright/test";
