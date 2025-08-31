import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

/**
 * Configuración de Playwright para pruebas E2E de Electron
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Directorio donde están las pruebas
  testDir: "./tests/e2e",

  // Ejecutar pruebas en archivos en paralelo - DESHABILITADO para Electron
  fullyParallel: false,

  // Fallar la build si hay pruebas que no deberían estar en CI
  forbidOnly: !!process.env.CI,

  // Reintentar en CI solamente
  retries: process.env.CI ? 2 : 0,

  // Usar solo 1 worker para evitar conflictos de Electron
  workers: 1,

  // Configuración de reportes
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],

  // Configuración compartida para todas las pruebas
  use: {
    // Capturar screenshots en caso de fallo
    screenshot: "only-on-failure",

    // Capturar video en caso de fallo
    video: "retain-on-failure",

    // Capturar trazas en caso de fallo
    trace: "on-first-retry",
  },

  // Configurar proyectos para diferentes escenarios
  projects: [
    {
      name: "electron",
      use: {
        // Configuración específica para Electron
        ...devices["Desktop Chrome"],
        // Timeout extendido para Electron
        actionTimeout: 10000,
        navigationTimeout: 30000,
      },
    },
  ],

  // Configuración del servidor web para desarrollo
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run build && npm run start",
        port: 0, // Electron no usa puerto HTTP
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000, // 2 minutos para que Electron inicie
      },
});
