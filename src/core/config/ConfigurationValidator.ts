import { ApiProvider } from "../../shared/api";
import { FrontendConfiguration, ValidationResult } from "../../shared/FrontendConfiguration";

/**
 * Validador especializado para configuraciones
 * Proporciona validación robusta y sanitización de datos
 */
export class ConfigurationValidator {

  /**
   * Valida una API key según el proveedor
   */
  static validateApiKey(provider: ApiProvider, apiKey: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!apiKey || apiKey.trim() === '') {
      // GenAI puede funcionar sin API key
      if (provider !== 'genai') {
        errors.push(`API Key is required for provider: ${provider}`);
      }
      return { isValid: errors.length === 0, errors, warnings };
    }

    // Validaciones específicas por proveedor
    switch (provider) {
      case 'anthropic':
        if (!apiKey.startsWith('sk-ant-')) {
          warnings.push('Anthropic API keys typically start with "sk-ant-"');
        }
        if (apiKey.length < 20) {
          errors.push('Anthropic API key appears to be too short');
        }
        break;

      case 'openai-native':
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          warnings.push('OpenAI API keys typically start with "sk-"');
        }
        if (apiKey.length < 20) {
          errors.push('OpenAI API key appears to be too short');
        }
        break;

      case 'genai':
        // GenAI puede tener diferentes formatos o ser vacío
        if (apiKey && apiKey.length < 10) {
          warnings.push('GenAI API key appears to be short');
        }
        break;

      default:
        // Validación genérica para otros proveedores
        if (apiKey.length < 10) {
          warnings.push('API key appears to be short');
        }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valida una URL base
   */
  static validateBaseUrl(url: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!url || url.trim() === '') {
      return { isValid: true, errors, warnings }; // Base URL es opcional
    }

    try {
      const parsedUrl = new URL(url);

      // Verificar protocolo
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('Base URL must use HTTP or HTTPS protocol');
      }

      // Preferir HTTPS
      if (parsedUrl.protocol === 'http:' && !parsedUrl.hostname.includes('localhost')) {
        warnings.push('Consider using HTTPS for security');
      }

      // Verificar que no termine en /
      if (url.endsWith('/')) {
        warnings.push('Base URL should not end with a slash');
      }

    } catch (error) {
      errors.push('Base URL must be a valid URL');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Valida parámetros del modelo
   */
  static validateModelParameters(config: FrontendConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar temperatura
    if (config.temperature !== undefined) {
      if (typeof config.temperature !== 'number') {
        errors.push('Temperature must be a number');
      } else if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      } else if (config.temperature > 1.5) {
        warnings.push('High temperature values may produce unpredictable results');
      }
    }

    // Validar maxTokens
    if (config.maxTokens !== undefined) {
      if (typeof config.maxTokens !== 'number' || !Number.isInteger(config.maxTokens)) {
        errors.push('Max tokens must be an integer');
      } else if (config.maxTokens < 1) {
        errors.push('Max tokens must be at least 1');
      } else if (config.maxTokens > 100000) {
        warnings.push('Very high token limits may be expensive');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitiza una configuración eliminando valores peligrosos
   */
  static sanitizeConfiguration(config: any): FrontendConfiguration {
    const sanitized: FrontendConfiguration = {};

    // Sanitizar strings
    if (typeof config.model === 'string') {
      sanitized.model = config.model.trim();
    }

    if (typeof config.apiKey === 'string') {
      sanitized.apiKey = config.apiKey.trim();
    }

    if (typeof config.baseUrl === 'string') {
      sanitized.baseUrl = config.baseUrl.trim().replace(/\/$/, ''); // Remover slash final
    }

    if (typeof config.authHeader === 'string') {
      sanitized.authHeader = config.authHeader.trim();
    }

    // Sanitizar números
    if (typeof config.temperature === 'number' && !isNaN(config.temperature)) {
      sanitized.temperature = Math.max(0, Math.min(2, config.temperature));
    }

    if (typeof config.maxTokens === 'number' && !isNaN(config.maxTokens)) {
      sanitized.maxTokens = Math.max(1, Math.min(100000, Math.floor(config.maxTokens)));
    }

    // Sanitizar provider
    if (typeof config.provider === 'string') {
      sanitized.provider = config.provider as ApiProvider;
    }

    // Sanitizar booleans de seguridad
    sanitized.autoApproveRead = Boolean(config.autoApproveRead);
    sanitized.autoApproveList = Boolean(config.autoApproveList);
    sanitized.autoRunCommands = Boolean(config.autoRunCommands);
    sanitized.confirmDangerous = config.confirmDangerous !== false; // Default true

    return sanitized;
  }

  /**
   * Validación completa de una configuración
   */
  static validateComplete(config: FrontendConfiguration): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Validar campos requeridos
    if (!config.provider) {
      allErrors.push('Provider is required');
    }

    if (!config.model) {
      allErrors.push('Model is required');
    }

    // Validar API key si hay proveedor
    if (config.provider && config.apiKey !== undefined) {
      const apiKeyValidation = this.validateApiKey(config.provider, config.apiKey);
      allErrors.push(...apiKeyValidation.errors);
      allWarnings.push(...apiKeyValidation.warnings);
    }

    // Validar base URL si se proporciona
    if (config.baseUrl) {
      const urlValidation = this.validateBaseUrl(config.baseUrl);
      allErrors.push(...urlValidation.errors);
      allWarnings.push(...urlValidation.warnings);
    }

    // Validar parámetros del modelo
    const modelValidation = this.validateModelParameters(config);
    allErrors.push(...modelValidation.errors);
    allWarnings.push(...modelValidation.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Sanitiza y valida en un solo paso
   */
  static sanitizeAndValidate(config: any): {
    sanitized: FrontendConfiguration;
    validation: ValidationResult
  } {
    const sanitized = this.sanitizeConfiguration(config);
    const validation = this.validateComplete(sanitized);

    return { sanitized, validation };
  }
}
