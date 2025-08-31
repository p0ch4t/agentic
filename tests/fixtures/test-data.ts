/**
 * Datos de prueba para las pruebas E2E
 */

export const TEST_MESSAGES = {
  // Mensajes simples para probar funcionalidad básica
  SIMPLE_GREETING: "Hola, ¿cómo estás?",
  SIMPLE_QUESTION: "¿Puedes ayudarme con una tarea simple?",

  // Mensajes para probar capacidades de IA
  CODE_REQUEST:
    "Crea una función en JavaScript que calcule el factorial de un número",
  FILE_OPERATION: "Lista los archivos en el directorio actual",
  COMPLEX_TASK: "Analiza el código de este proyecto y sugiere mejoras",

  // Mensajes para probar manejo de errores
  INVALID_REQUEST: "Ejecuta un comando que no existe: comando_inexistente_123",
  EMPTY_MESSAGE: "",
  VERY_LONG_MESSAGE: "A".repeat(10000),
};

export const TEST_CONFIGURATIONS = {
  // Configuración de API para pruebas
  MOCK_API_CONFIG: {
    provider: "genai",
    model: "gemini-2.5-pro",
    apiKey: "test-api-key-for-testing",
    baseUrl: "https://api.test.com",
    temperature: 0.7,
    maxTokens: 4096,
  },

  // Configuración de seguridad para pruebas
  SAFE_SETTINGS: {
    autoApproveRead: true,
    autoApproveList: true,
    confirmDangerous: false,
  },

  STRICT_SETTINGS: {
    autoApproveRead: false,
    autoApproveList: false,
    confirmDangerous: true,
  },
};

export const TEST_SELECTORS = {
  // Selectores comunes de la UI
  CHAT_INPUT:
    'textarea[placeholder*="mensaje"], input[placeholder*="mensaje"], textarea',
  SEND_BUTTON:
    'button:has-text("Enviar"), button:has-text("Send"), button[type="submit"]',
  MESSAGE_CONTAINER: '.message, .chat-message, [data-testid="message"]',
  AI_RESPONSE: '.ai-response, .assistant-message, [data-testid="ai-response"]',
  USER_MESSAGE: '.user-message, .human-message, [data-testid="user-message"]',

  // Selectores de configuración
  SETTINGS_BUTTON:
    'button:has-text("Configuración"), button:has-text("Settings")',
  API_CONFIG_SECTION: '[data-testid="api-config"], .api-configuration',

  // Selectores de estado
  LOADING_INDICATOR: '.loading, .spinner, [data-testid="loading"]',
  ERROR_MESSAGE: '.error, .error-message, [data-testid="error"]',
  SUCCESS_MESSAGE: '.success, .success-message, [data-testid="success"]',
};

export const TEST_TIMEOUTS = {
  // Timeouts para diferentes operaciones
  QUICK_ACTION: 2000, // 2 segundos para acciones rápidas
  NORMAL_ACTION: 5000, // 5 segundos para acciones normales
  AI_RESPONSE: 30000, // 30 segundos para respuestas de IA
  APP_STARTUP: 60000, // 1 minuto para inicio de aplicación
  FILE_OPERATION: 10000, // 10 segundos para operaciones de archivo
};

export const EXPECTED_RESPONSES = {
  // Patrones esperados en las respuestas
  GREETING_PATTERNS: [
    /hola/i,
    /buenos días/i,
    /buenas tardes/i,
    /¿cómo puedo ayudarte?/i,
  ],

  CODE_PATTERNS: [/function/i, /factorial/i, /return/i, /javascript/i],

  ERROR_PATTERNS: [/error/i, /no se pudo/i, /falló/i, /problema/i],
};

/**
 * Utilidad para generar datos de prueba dinámicos
 */
export class TestDataGenerator {
  /**
   * Genera un mensaje de prueba único
   */
  static generateUniqueMessage(prefix: string = "Mensaje de prueba"): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix} ${timestamp}-${random}`;
  }

  /**
   * Genera configuración de API de prueba
   */
  static generateTestApiConfig(
    overrides: Partial<typeof TEST_CONFIGURATIONS.MOCK_API_CONFIG> = {},
  ) {
    return {
      ...TEST_CONFIGURATIONS.MOCK_API_CONFIG,
      ...overrides,
      apiKey: `test-key-${Date.now()}`,
    };
  }

  /**
   * Genera un conjunto de mensajes de prueba para conversación
   */
  static generateConversationFlow(): string[] {
    return [
      "Hola, necesito ayuda con mi proyecto",
      "¿Puedes revisar mi código?",
      "Gracias por la ayuda",
      "¿Hay algo más que puedas sugerir?",
    ];
  }
}
