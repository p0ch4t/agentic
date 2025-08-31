# Pruebas E2E para Cline Desktop

Este directorio contiene las pruebas end-to-end (e2e) para la aplicación Cline Desktop usando Playwright.

## 🚀 Configuración Inicial

### Instalación de Dependencias

```bash
# Instalar dependencias del proyecto
npm install

# Instalar navegadores de Playwright
npm run test:install
```

### Compilar la Aplicación

```bash
# Compilar la aplicación antes de las pruebas
npm run build
```

## 🧪 Ejecutar Pruebas

### Comandos Disponibles

```bash
# Ejecutar todas las pruebas e2e (modo headless)
npm run test:e2e

# Ejecutar pruebas con interfaz gráfica visible
npm run test:e2e:headed

# Ejecutar pruebas en modo debug (paso a paso)
npm run test:e2e:debug

# Ejecutar pruebas con interfaz web de Playwright
npm run test:e2e:ui
```

### Ejecutar Pruebas Específicas

```bash
# Ejecutar solo pruebas básicas
npx playwright test app-basic

# Ejecutar solo pruebas de IA
npx playwright test ai-interaction

# Ejecutar solo pruebas de configuración
npx playwright test configuration

# Ejecutar una prueba específica
npx playwright test --grep "debería iniciar la aplicación correctamente"
```

## 📁 Estructura de Archivos

```
tests/
├── e2e/                    # Archivos de pruebas
│   ├── app-basic.spec.ts   # Pruebas básicas de la aplicación
│   ├── ai-interaction.spec.ts # Pruebas de interacción con IA
│   └── configuration.spec.ts  # Pruebas de configuración
├── fixtures/               # Datos de prueba
│   └── test-data.ts        # Constantes y datos de prueba
├── helpers/                # Utilidades para pruebas
│   └── electron-app.ts     # Helper para manejar Electron
└── screenshots/            # Capturas automáticas (generadas)
```

## 🔧 Configuración

### Archivo `playwright.config.ts`

La configuración principal incluye:

- Timeouts apropiados para Electron
- Captura de screenshots en fallos
- Grabación de video en fallos
- Reportes en múltiples formatos

### Variables de Entorno

```bash
# Para pruebas locales
NODE_ENV=test
DEBUG_MODE=false

# Para CI/CD
CI=true
```

## 📊 Tipos de Pruebas

### 1. Pruebas Básicas (`app-basic.spec.ts`)

- ✅ Inicio correcto de la aplicación
- ✅ Carga de interfaz principal
- ✅ Interacciones básicas
- ✅ Redimensionamiento de ventana
- ✅ Manejo de errores
- ✅ Rendimiento básico
- ✅ Limpieza de recursos

### 2. Pruebas de IA (`ai-interaction.spec.ts`)

- ✅ Detección de elementos de chat
- ✅ Escritura de mensajes
- ✅ Envío de mensajes
- ✅ Indicadores de estado
- ✅ Configuración de IA
- ✅ Historial de conversación
- ✅ Comandos de limpieza
- ✅ Múltiples mensajes en secuencia

### 3. Pruebas de Configuración (`configuration.spec.ts`)

- ✅ Carga de configuración por defecto
- ✅ Estado de conexión con IA
- ✅ Persistencia de configuraciones
- ✅ Manejo de configuraciones inválidas
- ✅ Información de versión
- ✅ Cambios de tema
- ✅ Validación de campos
- ✅ Almacenamiento local

## 🐛 Debugging

### Capturas de Pantalla

Las pruebas automáticamente toman capturas en:

- Fallos de pruebas
- Puntos específicos marcados en el código
- Guardadas en `tests/screenshots/`

### Logs y Trazas

```bash
# Ver logs detallados
npx playwright test --reporter=line

# Generar trazas detalladas
npx playwright test --trace=on

# Ver reporte HTML con detalles
npx playwright show-report
```

### Modo Debug Interactivo

```bash
# Ejecutar en modo debug paso a paso
npm run test:e2e:debug

# Ejecutar prueba específica en debug
npx playwright test --debug --grep "nombre de la prueba"
```

## 🔄 CI/CD

### GitHub Actions

El archivo `.github/workflows/e2e-tests.yml` configura:

- Ejecución en múltiples sistemas operativos
- Múltiples versiones de Node.js
- Subida automática de artefactos
- Pruebas con y sin interfaz gráfica

### Artefactos Generados

- `test-results/`: Resultados en JSON y XML
- `playwright-report/`: Reporte HTML interactivo
- `screenshots/`: Capturas de pantalla de fallos

## 📝 Escribir Nuevas Pruebas

### Estructura Básica

```typescript
import { test, expect } from "../helpers/electron-app";

test.describe("Mi Nueva Funcionalidad", () => {
  test("debería hacer algo específico", async ({ electronApp }) => {
    // Verificar estado inicial
    await electronApp.verifyAppHealth();

    // Realizar acciones
    await electronApp.page.click("button");

    // Verificar resultados
    expect(await electronApp.page.textContent("body")).toContain("esperado");
  });
});
```

### Mejores Prácticas

1. **Usar selectores robustos**: Preferir `data-testid` sobre clases CSS
2. **Esperas explícitas**: Usar `waitFor` en lugar de `waitForTimeout`
3. **Verificaciones múltiples**: Combinar verificaciones de UI y funcionalidad
4. **Limpieza**: Asegurar que las pruebas no dejen estado residual
5. **Capturas**: Tomar screenshots en puntos críticos para debugging

### Datos de Prueba

Usar constantes de `tests/fixtures/test-data.ts`:

```typescript
import { TEST_MESSAGES, TEST_TIMEOUTS } from "../fixtures/test-data";

// Usar mensajes predefinidos
await electronApp.sendAIMessage(TEST_MESSAGES.SIMPLE_GREETING);

// Usar timeouts apropiados
await electronApp.page.waitForSelector("selector", {
  timeout: TEST_TIMEOUTS.AI_RESPONSE,
});
```

## 🚨 Solución de Problemas

### Problemas Comunes

1. **Aplicación no inicia**

   - Verificar que `npm run build` se ejecutó correctamente
   - Comprobar que `dist/main.js` existe

2. **Timeouts en pruebas**

   - Aumentar timeouts en `playwright.config.ts`
   - Verificar que la aplicación no esté bloqueada

3. **Elementos no encontrados**

   - Usar `electronApp.takeScreenshot()` para debugging visual
   - Verificar selectores con las herramientas de desarrollo

4. **Pruebas inestables**
   - Agregar esperas explícitas
   - Verificar condiciones de carrera

### Logs de Debug

```bash
# Habilitar logs detallados
DEBUG=pw:* npm run test:e2e

# Ver solo logs de Playwright
DEBUG=pw:api npm run test:e2e
```

## 📈 Métricas y Reportes

### Reporte HTML

Después de ejecutar las pruebas:

```bash
npx playwright show-report
```

### Métricas Incluidas

- ✅ Tiempo de ejecución por prueba
- ✅ Capturas de pantalla de fallos
- ✅ Videos de sesiones fallidas
- ✅ Trazas detalladas de interacciones
- ✅ Logs de consola capturados

## 🤝 Contribuir

1. Agregar nuevas pruebas en `tests/e2e/`
2. Actualizar datos de prueba en `tests/fixtures/`
3. Documentar nuevas funcionalidades
4. Ejecutar todas las pruebas antes de commit
5. Incluir capturas de pantalla si es relevante
