#!/usr/bin/env node

/**
 * Utilidades para pruebas E2E
 * Script para facilitar el desarrollo y debugging de pruebas
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: "pipe",
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

class TestUtils {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "..");
    this.testsDir = path.join(this.projectRoot, "tests");
    this.screenshotsDir = path.join(this.testsDir, "screenshots");
  }

  // Verificar que el entorno esté configurado correctamente
  checkEnvironment() {
    log("🔍 Verificando entorno de pruebas...", "cyan");

    const checks = [
      {
        name: "Node.js",
        check: () => execCommand("node --version"),
        required: true,
      },
      {
        name: "NPM",
        check: () => execCommand("npm --version"),
        required: true,
      },
      {
        name: "Aplicación compilada",
        check: () =>
          fs.existsSync(path.join(this.projectRoot, "dist", "main.js")),
        required: true,
      },
      {
        name: "Playwright instalado",
        check: () => execCommand("npx playwright --version"),
        required: true,
      },
      {
        name: "Directorio de pruebas",
        check: () => fs.existsSync(this.testsDir),
        required: true,
      },
    ];

    let allPassed = true;

    checks.forEach(({ name, check, required }) => {
      const result = typeof check === "function" ? check() : check;
      const passed = typeof result === "boolean" ? result : result.success;

      if (passed) {
        log(`  ✅ ${name}`, "green");
      } else {
        log(`  ❌ ${name}`, "red");
        if (required) allPassed = false;
      }
    });

    if (allPassed) {
      log("✅ Entorno configurado correctamente", "green");
    } else {
      log("❌ Hay problemas en la configuración del entorno", "red");
      process.exit(1);
    }
  }

  // Compilar la aplicación antes de las pruebas
  buildApp() {
    log("🔨 Compilando aplicación...", "cyan");

    const result = execCommand("npm run build", { cwd: this.projectRoot });

    if (result.success) {
      log("✅ Aplicación compilada exitosamente", "green");
    } else {
      log("❌ Error compilando aplicación:", "red");
      log(result.error, "red");
      process.exit(1);
    }
  }

  // Ejecutar pruebas con opciones personalizadas
  runTests(options = {}) {
    const {
      headed = false,
      debug = false,
      grep = "",
      project = "",
      reporter = "html",
    } = options;

    log("🧪 Ejecutando pruebas E2E...", "cyan");

    let command = "npx playwright test";

    if (headed) command += " --headed";
    if (debug) command += " --debug";
    if (grep) command += ` --grep "${grep}"`;
    if (project) command += ` --project="${project}"`;
    if (reporter) command += ` --reporter=${reporter}`;

    log(`📋 Comando: ${command}`, "yellow");

    const result = execCommand(command, {
      cwd: this.projectRoot,
      stdio: "inherit",
    });

    if (result.success) {
      log("✅ Pruebas completadas", "green");
    } else {
      log("❌ Algunas pruebas fallaron", "red");
    }
  }

  // Limpiar archivos de prueba generados
  cleanup() {
    log("🧹 Limpiando archivos de prueba...", "cyan");

    const dirsToClean = [
      path.join(this.projectRoot, "test-results"),
      path.join(this.projectRoot, "playwright-report"),
      this.screenshotsDir,
    ];

    dirsToClean.forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log(
          `  🗑️ Eliminado: ${path.relative(this.projectRoot, dir)}`,
          "yellow",
        );
      }
    });

    log("✅ Limpieza completada", "green");
  }

  // Generar reporte de cobertura de pruebas
  generateCoverageReport() {
    log("📊 Generando reporte de cobertura...", "cyan");

    const testFiles = this.getTestFiles();
    const totalTests = this.countTests(testFiles);

    log(`📁 Archivos de prueba encontrados: ${testFiles.length}`, "blue");
    log(`🧪 Total de pruebas: ${totalTests}`, "blue");

    // Generar reporte básico
    const report = {
      timestamp: new Date().toISOString(),
      testFiles: testFiles.length,
      totalTests: totalTests,
      files: testFiles.map((file) => ({
        name: path.relative(this.testsDir, file),
        tests: this.countTestsInFile(file),
      })),
    };

    const reportPath = path.join(this.projectRoot, "test-coverage-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log(`📋 Reporte guardado en: ${reportPath}`, "green");
  }

  // Obtener lista de archivos de prueba
  getTestFiles() {
    const e2eDir = path.join(this.testsDir, "e2e");
    if (!fs.existsSync(e2eDir)) return [];

    return fs
      .readdirSync(e2eDir)
      .filter((file) => file.endsWith(".spec.ts"))
      .map((file) => path.join(e2eDir, file));
  }

  // Contar pruebas en todos los archivos
  countTests(files) {
    return files.reduce(
      (total, file) => total + this.countTestsInFile(file),
      0,
    );
  }

  // Contar pruebas en un archivo específico
  countTestsInFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const testMatches = content.match(/test\(/g) || [];
      return testMatches.length;
    } catch (error) {
      return 0;
    }
  }

  // Mostrar ayuda
  showHelp() {
    log("🚀 Utilidades de Pruebas E2E para Cline Desktop", "bright");
    log("");
    log("Comandos disponibles:", "cyan");
    log("  check     - Verificar configuración del entorno", "yellow");
    log("  build     - Compilar la aplicación", "yellow");
    log("  test      - Ejecutar todas las pruebas", "yellow");
    log("  test-headed - Ejecutar pruebas con interfaz gráfica", "yellow");
    log("  debug     - Ejecutar pruebas en modo debug", "yellow");
    log("  cleanup   - Limpiar archivos generados", "yellow");
    log("  coverage  - Generar reporte de cobertura", "yellow");
    log("  help      - Mostrar esta ayuda", "yellow");
    log("");
    log("Ejemplos:", "cyan");
    log("  node scripts/test-utils.js check", "green");
    log("  node scripts/test-utils.js test", "green");
    log("  node scripts/test-utils.js debug", "green");
  }
}

// Ejecutar comando basado en argumentos
function main() {
  const utils = new TestUtils();
  const command = process.argv[2];

  switch (command) {
    case "check":
      utils.checkEnvironment();
      break;

    case "build":
      utils.buildApp();
      break;

    case "test":
      utils.checkEnvironment();
      utils.buildApp();
      utils.runTests();
      break;

    case "test-headed":
      utils.checkEnvironment();
      utils.buildApp();
      utils.runTests({ headed: true });
      break;

    case "debug":
      utils.checkEnvironment();
      utils.buildApp();
      utils.runTests({ debug: true });
      break;

    case "cleanup":
      utils.cleanup();
      break;

    case "coverage":
      utils.generateCoverageReport();
      break;

    case "help":
    case "--help":
    case "-h":
      utils.showHelp();
      break;

    default:
      if (command) {
        log(`❌ Comando desconocido: ${command}`, "red");
        log("");
      }
      utils.showHelp();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = TestUtils;
