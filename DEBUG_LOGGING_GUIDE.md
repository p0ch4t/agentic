# 🐛 Guía de Debug Logging para Análisis de Conversaciones

Este sistema registra automáticamente todas las conversaciones cuando está en modo debug, permitiendo análisis posterior y mejoras conjuntas del comportamiento del AI.

## 🚀 Activación del Modo Debug

### Opción 1: Variables de Entorno

```bash
# Desarrollo
export NODE_ENV=development
npm run dev

# O específicamente para debug
export DEBUG_MODE=true
npm run dev
```

### Opción 2: Parámetro de Línea de Comandos

```bash
npm run dev -- --debug
```

### Opción 3: Programáticamente

```typescript
import { enableDebugMode } from "./src/examples/debug-logging-example";
enableDebugMode();
```

## 📝 ¿Qué se Registra Automáticamente?

### Conversaciones Completas

- ✅ **Mensaje del usuario**
- ✅ **Respuesta del AI**
- ✅ **Tiempo de respuesta**
- ✅ **Herramientas utilizadas**
- ✅ **Análisis de auto-reflexión**
- ✅ **Errores detectados**
- ✅ **Correcciones aplicadas**
- ✅ **Metadatos del modelo** (temperatura, tokens, etc.)

### Errores del Sistema

- ❌ **Errores de ejecución**
- 🔧 **Contexto del error**
- 📊 **Stack traces**
- 🎯 **Datos adicionales**

### Métricas de Rendimiento

- ⏱️ **Duración de operaciones**
- 💾 **Uso de memoria**
- 🎯 **Tokens utilizados**
- 📈 **Estadísticas personalizadas**

## 📁 Ubicación de los Logs

Los logs se guardan en:

```
~/.cline-desktop/debug-logs/debug_conversation_[timestamp].log
```

### Estructura del Archivo

```
=== DEBUG CONVERSATION LOG ===
Sesión: session_1703123456789_abc123def
Inicio: 2024-01-15T10:30:00.000Z
===================================

--- CONVERSACIÓN 2024-01-15T10:30:15.123Z ---
Usuario: Lista los archivos del directorio ~

AI: 🔧 Corrección Automática Aplicada
Detecté que el símbolo ~ no se expandió correctamente...
[respuesta corregida]

Metadata:
- Analizada: true
- Error detectado: true
- Corrección aplicada: true
- Herramientas usadas: listFiles
- Tiempo de respuesta: 2341ms
- Datos adicionales: {...}
--- FIN CONVERSACIÓN ---

=== RESUMEN DE SESIÓN ===
Total mensajes: 15
Errores detectados: 3
Correcciones aplicadas: 2
Tasa de error: 20.00%
Tasa de corrección: 66.67%
===
```

## 🔧 Uso Programático

### Logging Automático

```typescript
import { createSelfReflectiveAI } from "./src/core/ai/SelfReflectiveAIAgent";

const ai = createSelfReflectiveAI(hostProvider, config);

// El logging es automático
const response = await ai.sendMessage("Tu pregunta");
// ✅ Se registra automáticamente si está en modo debug
```

### Logging Manual de Métricas

```typescript
import { debugLogger } from "./src/core/logging/DebugConversationLogger";

await debugLogger.logPerformanceMetrics({
  operation: "custom_analysis",
  duration: 1500,
  memoryUsage: 1024000,
  customMetric: "valor",
});
```

### Obtener Estadísticas

```typescript
const stats = ai.getDebugStats();
console.log("Tasa de error:", stats.errorRate);
console.log("Correcciones aplicadas:", stats.correctionsApplied);
```

## 📤 Exportar para Compartir

### Automático al Finalizar

```typescript
// Al cerrar la aplicación o finalizar sesión
const exportPath = await ai.finalizeDebugSession();
console.log("Log exportado:", exportPath);
```

### Manual

```typescript
import { debugLogger } from "./src/core/logging/DebugConversationLogger";

const exportPath = await debugLogger.exportLogForSharing();
// Genera archivo anonimizado para compartir
```

## 🔒 Privacidad y Seguridad

### Datos Anonimizados en Exportación

- 🏠 `/Users/usuario` → `/Users/[USER]`
- 📧 `email@domain.com` → `[EMAIL]`
- 🌐 `192.168.1.1` → `[IP]`
- 🔑 `hash123abc...` → `[HASH]`

### Límites de Tamaño

- Mensajes truncados a 2000 caracteres
- Logs rotados automáticamente
- Limpieza de logs antiguos

## 📊 Análisis de los Logs

### Métricas Clave a Revisar

1. **Tasa de Error**: ¿Qué % de respuestas tienen errores?
2. **Tasa de Corrección**: ¿Qué % de errores se corrigen automáticamente?
3. **Tiempo de Respuesta**: ¿Cuánto tarda el análisis + corrección?
4. **Tipos de Error**: ¿Qué errores son más comunes?
5. **Efectividad de Correcciones**: ¿Las correcciones resuelven el problema?

### Patrones a Buscar

- 🔄 **Errores recurrentes** que necesitan mejoras en el sistema
- ⚡ **Respuestas lentas** que requieren optimización
- 🎯 **Correcciones fallidas** que necesitan mejor lógica
- 📈 **Tendencias de mejora** a lo largo del tiempo

## 🤝 Colaboración y Mejoras

### Compartir Logs para Análisis

1. Ejecuta con modo debug habilitado
2. Usa la aplicación normalmente
3. Finaliza la sesión: `ai.finalizeDebugSession()`
4. Comparte el archivo `*_export.json` generado

### Formato de Feedback

Cuando compartas logs, incluye:

- 🎯 **Objetivo**: ¿Qué estabas tratando de lograr?
- ❌ **Problema**: ¿Qué salió mal?
- 💡 **Expectativa**: ¿Qué esperabas que pasara?
- 📝 **Contexto**: Información adicional relevante

## 🚀 Ejemplos de Uso

Ver archivo completo: `src/examples/debug-logging-example.ts`

```typescript
import { runDebugLoggingExamples } from "./src/examples/debug-logging-example";

// Ejecutar todos los ejemplos
await runDebugLoggingExamples(mainWindow);
```

## 🔧 Configuración Avanzada

### Variables de Entorno Opcionales

```bash
# Directorio personalizado para logs
export DEBUG_LOG_DIR="/custom/path/logs"

# Nivel de detalle (1-5)
export DEBUG_VERBOSITY=3

# Rotación automática de logs (días)
export DEBUG_LOG_RETENTION=7
```

---

**💡 Tip**: Mantén el modo debug activado durante desarrollo para capturar automáticamente todas las interacciones y poder analizarlas posteriormente para mejoras continuas del sistema de IA.
