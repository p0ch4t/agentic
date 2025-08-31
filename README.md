# Cline Desktop - Aplicación Electron

Una aplicación de escritorio basada en Electron que integra un agente de IA conversacional con capacidades avanzadas de ejecución de comandos y gestión de archivos.

## 🚀 Características

### **Agente de IA Avanzado** (Basado en patrones de Cline)

- **Streaming en Tiempo Real**: Respuestas incrementales con actualizaciones en vivo
- **Gestión Inteligente de Contexto**: Truncamiento automático y preservación de información crítica
- **Recuperación de Errores**: Sistema robusto de reintentos y recuperación automática
- **Memoria Persistente**: Recuerda información del usuario entre sesiones

### **Capacidades del Sistema**

- **Ejecución de Comandos**: Capacidad de ejecutar comandos del sistema con aprobación del usuario
- **Gestión de Archivos**: Lectura, escritura y manipulación de archivos del sistema
- **Múltiples Proveedores de IA**: Soporte para Anthropic, OpenAI, GenAI y más
- **Interfaz Sencilla**: UI básica con HTML/CSS/JS
- **Configuración Flexible**: Configuración de modelos, API keys y comportamiento

## 📦 Estructura del Proyecto

```
├── src/
│   ├── core/                 # Lógica central de la aplicación
│   │   ├── ai/              # Agentes de IA y sistemas mejorados
│   │   │   ├── AIAgent.ts           # Agente principal con mejoras de Cline
│   │   │   ├── StreamingManager.ts  # Sistema de streaming en tiempo real
│   │   │   ├── ContextManager.ts    # Gestión inteligente de contexto
│   │   │   ├── ErrorHandler.ts      # Manejo robusto de errores
│   │   │   └── SmartAIAgent.ts      # Wrapper inteligente
│   │   ├── api/             # Proveedores de API
│   │   ├── controller/      # Controlador principal de Electron
│   │   ├── storage/         # Gestión de almacenamiento
│   │   ├── task/            # Gestión de tareas
│   │   └── terminal/        # Gestión de terminal
│   ├── host/                # Proveedor de host para Electron
│   ├── shared/              # Tipos y utilidades compartidas
│   ├── ui/                  # Aplicación principal de escritorio
│   ├── main.ts              # Proceso principal de Electron
│   └── preload.ts           # Script de preload
├── renderer/                # Interfaz HTML básica

├── config/                  # Archivos de configuración
└── assets/                  # Recursos estáticos
```

## 🛠️ Instalación y Desarrollo

### Prerrequisitos

- Node.js 16+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd agentic

# Instalar dependencias del proyecto principal
npm install

# La interfaz está en renderer/ (HTML/CSS/JS básico)
```

### Desarrollo

```bash
# Compilar el proyecto
npm run build

# Ejecutar en modo desarrollo
npm run dev

# Empaquetar la aplicación
npm run package
```

## ⚙️ Configuración

### Configuración de API

La aplicación soporta múltiples proveedores de IA. Configura tu API key en la interfaz de configuración:

1. Abre la aplicación
2. Ve a Configuración (⚙️)
3. Selecciona tu proveedor preferido
4. Ingresa tu API key
5. Configura el modelo y parámetros

### Proveedores Soportados

- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
- **GenAI**: Modelos personalizados
- **Y más...**

## 🎯 Uso

### Chat Básico

1. Inicia la aplicación
2. Escribe tu pregunta en el campo de texto
3. Presiona Enter o haz clic en "Enviar"
4. El agente de IA responderá con streaming en tiempo real

### **🚀 Nuevas Capacidades Avanzadas**

#### **Streaming en Tiempo Real**

- Las respuestas aparecen incrementalmente mientras se generan
- Actualizaciones en vivo sin esperar la respuesta completa
- Prevención de condiciones de carrera en el streaming

#### **Gestión Inteligente de Contexto**

- Truncamiento automático cuando se alcanza el límite de tokens
- Preservación de información crítica (mensajes importantes, datos del usuario)
- Soporte para diferentes modelos con límites variables de contexto
- Estadísticas en tiempo real del uso de tokens

#### **Recuperación Automática de Errores**

- Reintentos automáticos para errores transitorios
- Backoff exponencial para evitar spam de solicitudes
- Limpieza automática de recursos después de errores
- Estadísticas detalladas de errores y recuperación

#### **Memoria Persistente**

- Recuerda información personal del usuario (nombre, preferencias)
- Mantiene contexto entre sesiones
- Detección automática de información importante
- Preservación inteligente durante truncamiento de contexto

### Aprobación de Herramientas

Cuando el agente necesite ejecutar comandos o modificar archivos:

1. Se mostrará una solicitud de aprobación
2. Revisa la acción propuesta
3. Haz clic en "Aprobar" o "Rechazar"
4. La herramienta se ejecutará si fue aprobada

### Configuración de Seguridad

En la configuración puedes establecer:

- **Auto-aprobar lectura**: Aprobar automáticamente operaciones de lectura
- **Auto-aprobar listado**: Aprobar automáticamente listado de directorios
- **Confirmar operaciones peligrosas**: Siempre pedir confirmación para modificaciones

## 🔧 Desarrollo Avanzado

### Agregar Nuevos Proveedores de IA

1. Crea un nuevo archivo en `src/core/api/providers/`
2. Implementa la interfaz del proveedor
3. Agrega el proveedor al índice en `src/core/api/index.ts`
4. Actualiza la configuración en `src/shared/api.ts`

### Personalizar la Interfaz

La interfaz está construida con HTML/CSS/JS básico en el directorio `renderer/`. Puedes:

- Modificar componentes existentes
- Agregar nuevas páginas
- Personalizar estilos y temas

## 📝 Scripts Disponibles

- `npm run build` - Compila TypeScript
- `npm run dev` - Modo desarrollo con recarga automática
- `npm run package` - Empaqueta la aplicación para distribución
- `npm start` - Inicia la aplicación compilada

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- Basado en el proyecto [Cline](https://github.com/cline/cline)
- Construido con [Electron](https://electronjs.org/)
- UI con [React](https://reactjs.org/) y [Tailwind CSS](https://tailwindcss.com/)
