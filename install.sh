#!/bin/bash

# Cline Desktop - Script de Instalación
# Este script instala y configura Cline Desktop en tu sistema

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Cline Desktop - Instalador${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar la versión de Node.js
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="18.0.0"
        
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_message "Node.js versión $NODE_VERSION detectada ✓"
            return 0
        else
            print_error "Node.js versión $NODE_VERSION detectada, pero se requiere $REQUIRED_VERSION o superior"
            return 1
        fi
    else
        print_error "Node.js no está instalado"
        return 1
    fi
}

# Función para verificar si npm está instalado
check_npm() {
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_message "npm versión $NPM_VERSION detectada ✓"
        return 0
    else
        print_error "npm no está instalado"
        return 1
    fi
}

# Función para instalar dependencias
install_dependencies() {
    print_message "Instalando dependencias..."
    
    if npm install; then
        print_message "Dependencias instaladas correctamente ✓"
    else
        print_error "Error al instalar dependencias"
        exit 1
    fi
}

# Función para compilar el proyecto
build_project() {
    print_message "Compilando el proyecto..."
    
    if npm run build; then
        print_message "Proyecto compilado correctamente ✓"
    else
        print_error "Error al compilar el proyecto"
        exit 1
    fi
}

# Función para crear archivo de configuración
create_config() {
    print_message "Creando archivo de configuración..."
    
    if [ ! -f .env ]; then
        cat > .env << EOF
# Cline Desktop Configuration
# Configura tus claves de API aquí

# Clave de API de Cline (opcional)
# CLINE_API_KEY=tu_clave_aqui

# Clave de API de Anthropic (para Claude)
# ANTHROPIC_API_KEY=tu_clave_aqui

# Clave de API de OpenAI (para GPT)
# OPENAI_API_KEY=tu_clave_aqui

# Clave de API de Google (para Gemini)
# GOOGLE_API_KEY=tu_clave_aqui

# Configuración del modelo por defecto
DEFAULT_AI_MODEL=claude-3-sonnet
MAX_TOKENS=4000
TEMPERATURE=0.7
AUTO_APPROVE=false
EOF
        print_message "Archivo .env creado ✓"
        print_warning "Edita el archivo .env con tus claves de API"
    else
        print_message "Archivo .env ya existe ✓"
    fi
}

# Función para crear directorio de assets
create_assets_dir() {
    print_message "Creando directorio de assets..."
    
    mkdir -p assets/icons
    mkdir -p assets/images
    
    # Crear un icono placeholder si no existe
    if [ ! -f assets/icons/icon.png ]; then
        print_warning "Directorio de assets creado. Añade tu icono en assets/icons/icon.png"
    fi
}

# Función para configurar scripts de desarrollo
setup_dev_scripts() {
    print_message "Configurando scripts de desarrollo..."
    
    # Verificar si los scripts ya están en package.json
    if ! grep -q '"dev"' package.json; then
        print_warning "Scripts de desarrollo no encontrados en package.json"
        print_warning "Asegúrate de que tu package.json tenga los scripts necesarios"
    else
        print_message "Scripts de desarrollo configurados ✓"
    fi
}

# Función para mostrar instrucciones post-instalación
show_post_install_instructions() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  Instalación Completada ✓${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo "Para ejecutar Cline Desktop:"
    echo ""
    echo "1. Configura tus claves de API en el archivo .env"
    echo "2. Ejecuta en modo desarrollo:"
    echo "   npm run dev"
    echo ""
    echo "3. O compila y ejecuta en modo producción:"
    echo "   npm run build"
    echo "   npm start"
    echo ""
    echo "4. Para empaquetar la aplicación:"
    echo "   npm run package"
    echo ""
    echo "Documentación completa: README-CLINE-DESKTOP.md"
    echo ""
}

# Función principal
main() {
    print_header
    
    # Verificar requisitos del sistema
    print_message "Verificando requisitos del sistema..."
    
    if ! check_node_version; then
        print_error "Por favor, instala Node.js versión 18.0.0 o superior"
        print_error "Visita: https://nodejs.org/"
        exit 1
    fi
    
    if ! check_npm; then
        print_error "Por favor, instala npm"
        exit 1
    fi
    
    print_message "Requisitos del sistema verificados ✓"
    
    # Instalar dependencias
    install_dependencies
    
    # Compilar el proyecto
    build_project
    
    # Crear archivo de configuración
    create_config
    
    # Crear directorio de assets
    create_assets_dir
    
    # Configurar scripts de desarrollo
    setup_dev_scripts
    
    # Mostrar instrucciones post-instalación
    show_post_install_instructions
}

# Función para limpiar en caso de error
cleanup() {
    print_error "Error durante la instalación. Limpiando..."
    # Aquí podrías añadir lógica de limpieza si es necesario
}

# Configurar trap para limpieza en caso de error
trap cleanup ERR

# Ejecutar función principal
main "$@" 