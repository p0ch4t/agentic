# Cline Desktop - AI Agent Application

Una aplicación de escritorio basada en Electron que integra el agente de IA de Cline para realizar tareas de desarrollo de manera autónoma y colaborativa.

## 🚀 Características

- **Agente de IA Inteligente**: Utiliza modelos de IA avanzados (Claude, GPT, Gemini, etc.) para entender y ejecutar tareas
- **Interfaz de Usuario Moderna**: Diseño limpio y responsive con navegación intuitiva
- **Gestión de Tareas**: Sistema completo para crear, ejecutar y monitorear tareas de desarrollo
- **Aprobación de Herramientas**: Control total sobre las operaciones del agente antes de su ejecución
- **Visualización de Diferencias**: Vista lado a lado para revisar cambios en archivos
- **Logs en Tiempo Real**: Seguimiento completo de todas las operaciones
- **Configuración Flexible**: Personalización de modelos de IA y parámetros

## 🛠️ Tecnologías Utilizadas

- **Electron**: Framework para aplicaciones de escritorio multiplataforma
- **TypeScript**: Tipado estático para mayor robustez del código
- **HTML5/CSS3**: Interfaz de usuario moderna y responsive
- **Node.js**: Runtime para operaciones del sistema y APIs

## 📋 Requisitos del Sistema

- **Sistema Operativo**: Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **Node.js**: Versión 18.0.0 o superior
- **RAM**: Mínimo 4GB, recomendado 8GB+
- **Espacio en Disco**: 500MB para la aplicación + espacio para proyectos

## 🚀 Instalación

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd cline-desktop
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crear un archivo `.env` en la raíz del proyecto:
```env
CLINE_API_KEY=tu_api_key_aqui
ANTHROPIC_API_KEY=tu_claude_api_key
OPENAI_API_KEY=tu_openai_api_key
```

### 4. Compilar y Ejecutar
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm start

# Empaquetar para distribución
npm run package
```

## 🎯 Uso de la Aplicación

### Iniciar una Tarea
1. Abre la aplicación Cline Desktop
2. Escribe una descripción de lo que quieres lograr en el campo de entrada
3. Haz clic en "Start Task"
4. El agente analizará tu solicitud y creará un plan de acción

### Ejemplos de Tareas
- "Crear una página web simple con HTML y CSS"
- "Ayúdame a debuggear este script de Python"
- "Configura un proyecto Node.js con Express"
- "Crea un componente React para una lista de tareas"

### Aprobación de Operaciones
- **Herramientas del Sistema**: El agente pedirá permiso antes de ejecutar comandos
- **Cambios en Archivos**: Revisa las diferencias antes de aplicar modificaciones
- **Operaciones de Red**: Aproba conexiones a APIs externas

## ⚙️ Configuración

### Modelos de IA Soportados
- **Anthropic Claude**: Claude 3 Sonnet, Claude 3 Haiku
- **OpenAI**: GPT-4, GPT-3.5 Turbo
- **Google**: Gemini Pro, Gemini Flash
- **Otros**: AWS Bedrock, Azure OpenAI, modelos locales

### Parámetros Configurables
- **API Keys**: Configuración segura de claves de API
- **Max Tokens**: Límite de tokens por solicitud
- **Temperature**: Control de creatividad vs precisión
- **Auto-aprobación**: Aprobación automática de operaciones simples

## 🔧 Desarrollo

### Estructura del Proyecto
```
cline-desktop/
├── src/                    # Código fuente TypeScript
│   ├── main.ts            # Proceso principal de Electron
│   ├── preload.ts         # Script de precarga seguro
│   ├── core/              # Lógica del agente de IA
│   ├── host/              # Proveedor de host personalizado
│   ├── services/          # Servicios del sistema
│   └── ui/                # Lógica de la interfaz
├── renderer/               # Archivos de la interfaz de usuario
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos CSS
│   └── renderer.js        # JavaScript del renderer
├── dist/                   # Código compilado
└── package.json            # Configuración del proyecto
```

### Comandos de Desarrollo
```bash
# Compilar TypeScript
npm run build

# Compilar en modo watch
npm run build:watch

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test

# Linting y formateo
npm run lint
npm run format
```

### Arquitectura
- **Proceso Principal**: Maneja la lógica del agente y operaciones del sistema
- **Proceso Renderer**: Interfaz de usuario y comunicación con el usuario
- **Comunicación IPC**: Comunicación segura entre procesos
- **Proveedor de Host**: Adaptador para operaciones del sistema operativo

## 🧪 Testing

### Tests Unitarios
```bash
npm run test:unit
```

### Tests de Integración
```bash
npm run test:integration
```

### Tests End-to-End
```bash
npm run test:e2e
```

## 📦 Distribución

### Empaquetado
```bash
# Para Windows
npm run package:win

# Para macOS
npm run package:mac

# Para Linux
npm run package:linux

# Para todas las plataformas
npm run package:all
```

### Instaladores
- **Windows**: `.exe` y `.msi`
- **macOS**: `.dmg` y `.pkg`
- **Linux**: `.AppImage`, `.deb`, `.rpm`

## 🔒 Seguridad

- **Aislamiento de Contexto**: Los procesos están completamente aislados
- **Aprobación Manual**: Todas las operaciones sensibles requieren aprobación
- **Validación de Entrada**: Verificación de todos los datos de entrada
- **Logs de Auditoría**: Registro completo de todas las operaciones

## 🤝 Contribución

### Guías de Contribución
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código
- Usar TypeScript para todo el código nuevo
- Seguir las convenciones de ESLint y Prettier
- Escribir tests para nuevas funcionalidades
- Documentar APIs y funciones complejas

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

### Recursos de Ayuda
- **Documentación**: [docs.cline.bot](https://docs.cline.bot)
- **Discord**: [discord.gg/cline](https://discord.gg/cline)
- **Reddit**: [r/cline](https://www.reddit.com/r/cline)
- **Issues**: [GitHub Issues](https://github.com/cline/cline/issues)

### Problemas Comunes
1. **Error de API Key**: Verifica que tu clave de API sea válida
2. **Problemas de Permisos**: Asegúrate de que la aplicación tenga permisos de escritura
3. **Errores de Compilación**: Verifica que Node.js esté actualizado

## 🔮 Roadmap

### Versión 1.1
- [ ] Soporte para más modelos de IA
- [ ] Integración con MCP (Model Context Protocol)
- [ ] Sistema de plugins

### Versión 1.2
- [ ] Colaboración en tiempo real
- [ ] Historial de tareas persistente
- [ ] Exportación de resultados

### Versión 2.0
- [ ] Soporte para múltiples agentes
- [ ] Integración con IDEs populares
- [ ] API REST para integraciones externas

## 🙏 Agradecimientos

- **Equipo de Cline**: Por el agente de IA base
- **Comunidad Electron**: Por el framework de aplicaciones de escritorio
- **Contribuidores**: Por todas las mejoras y sugerencias

---

**Cline Desktop** - Tu compañero de desarrollo inteligente 🤖✨ 