import { ApiConfiguration, ApiProvider } from "../../shared/api";
import { FrontendConfiguration, ValidationResult } from "../../shared/FrontendConfiguration";
import { ConfigurationValidator } from "./ConfigurationValidator";

/**
 * Mapeo de campos específicos por proveedor
 */
interface ProviderFieldMapping {
  apiKey: keyof ApiConfiguration;
  baseUrl: keyof ApiConfiguration;
}

/**
 * Manager centralizado para toda la lógica de configuración
 * Evita duplicación de código y errores de mapeo
 */
export class ConfigurationManager {
  /**
   * Mapeo de campos por proveedor - Fácil de mantener y extender
   */
  private static readonly PROVIDER_FIELD_MAPPING: Record<string, ProviderFieldMapping> = {
    anthropic: {
      apiKey: 'apiKey',
      baseUrl: 'anthropicBaseUrl'
    },
    'openai-native': {
      apiKey: 'openAiNativeApiKey',
      baseUrl: 'openAiNativeBaseUrl'
    },
    genai: {
      apiKey: 'genAiApiKey',
      baseUrl: 'genAiBaseUrl'
    },
    openrouter: {
      apiKey: 'openRouterApiKey',
      baseUrl: 'openAiBaseUrl' // OpenRouter usa el mismo campo que OpenAI
    },
    gemini: {
      apiKey: 'geminiApiKey',
      baseUrl: 'geminiBaseUrl'
    }
    // Fácil agregar nuevos proveedores aquí
  };

  /**
   * Convierte ApiConfiguration interna a FrontendConfiguration
   * Esta es la función que reemplaza getFullConfiguration
   */
  static normalizeForFrontend(
    apiConfig?: ApiConfiguration,
    safetySettings?: any
  ): FrontendConfiguration {
    const normalized: FrontendConfiguration = {};

    // Mapear configuración de API si existe
    if (apiConfig) {
      const provider = apiConfig.actModeApiProvider || 'anthropic';
      const mapping = this.PROVIDER_FIELD_MAPPING[provider];

      // Campos básicos
      normalized.model = apiConfig.actModeApiModelId;
      normalized.temperature = apiConfig.temperature;
      normalized.maxTokens = apiConfig.maxTokens;
      normalized.provider = provider as ApiProvider;
      normalized.authHeader = apiConfig.authHeader;

      // Mapear campos específicos del proveedor
      if (mapping) {
        normalized.apiKey = apiConfig[mapping.apiKey] as string;
        normalized.baseUrl = apiConfig[mapping.baseUrl] as string;
      } else {
        console.warn(`⚠️ [ConfigurationManager] Unknown provider: ${provider}`);
        // Fallback para proveedores no mapeados
        normalized.apiKey = apiConfig.apiKey;
        normalized.baseUrl = apiConfig.anthropicBaseUrl;
      }
    }

    // Mapear configuraciones de seguridad
    if (safetySettings) {
      normalized.autoApproveRead = safetySettings.autoApproveRead || false;
      normalized.autoApproveList = safetySettings.autoApproveList || false;
      normalized.autoRunCommands = safetySettings.autoRunCommands || false;
      normalized.confirmDangerous = safetySettings.confirmDangerous !== false;
      // TEMPORALMENTE DESHABILITADO: Memoria persistente deshabilitada por defecto
      normalized.persistentMemory = safetySettings.persistentMemory === true;

      console.log(`🔍 [ConfigurationManager] Mapped safety settings:`, {
        safetySettings,
        normalized: {
          autoApproveRead: normalized.autoApproveRead,
          autoApproveList: normalized.autoApproveList,
          autoRunCommands: normalized.autoRunCommands,
          confirmDangerous: normalized.confirmDangerous
        }
      });
    } else {
      console.log(`⚠️ [ConfigurationManager] No safety settings found, using defaults`);
    }

    return normalized;
  }

  /**
   * Convierte FrontendConfiguration a ApiConfiguration y SafetySettings
   * Para cuando el frontend envía configuración al backend
   */
  static denormalizeFromFrontend(frontendConfig: FrontendConfiguration): {
    apiConfig: Partial<ApiConfiguration>;
    safetySettings: any;
  } {
    const provider = frontendConfig.provider || 'anthropic';
    const mapping = this.PROVIDER_FIELD_MAPPING[provider];

    // Configuración base de API
    const apiConfig: Partial<ApiConfiguration> = {
      actModeApiProvider: provider as ApiProvider,
      planModeApiProvider: provider as ApiProvider,
      actModeApiModelId: frontendConfig.model,
      planModeApiModelId: frontendConfig.model,
      temperature: frontendConfig.temperature,
      maxTokens: frontendConfig.maxTokens,
      authHeader: frontendConfig.authHeader
    };

    // Mapear campos específicos del proveedor
    if (mapping && frontendConfig.apiKey) {
      (apiConfig as any)[mapping.apiKey] = frontendConfig.apiKey;
    }
    if (mapping && frontendConfig.baseUrl) {
      (apiConfig as any)[mapping.baseUrl] = frontendConfig.baseUrl;
    }

    // Configuraciones de seguridad
    const safetySettings = {
      autoApproveRead: frontendConfig.autoApproveRead || false,
      autoApproveList: frontendConfig.autoApproveList || false,
      autoRunCommands: frontendConfig.autoRunCommands || false,
      confirmDangerous: frontendConfig.confirmDangerous !== false,
      // TEMPORALMENTE DESHABILITADO: Memoria persistente deshabilitada por defecto
      persistentMemory: frontendConfig.persistentMemory === true // Por defecto false
    };

    console.log(`🔍 [ConfigurationManager] Denormalizing frontend config:`, {
      frontendConfig: {
        autoApproveRead: frontendConfig.autoApproveRead,
        autoApproveList: frontendConfig.autoApproveList,
        autoRunCommands: frontendConfig.autoRunCommands,
        confirmDangerous: frontendConfig.confirmDangerous
      },
      safetySettings
    });

    return { apiConfig, safetySettings };
  }

  /**
   * Valida que una configuración sea válida
   * Delega al ConfigurationValidator especializado
   */
  static validateConfiguration(config: FrontendConfiguration): ValidationResult {
    return ConfigurationValidator.validateComplete(config);
  }

  /**
   * Sanitiza y valida una configuración en un solo paso
   */
  static sanitizeAndValidateConfiguration(config: any): {
    sanitized: FrontendConfiguration;
    validation: ValidationResult
  } {
    return ConfigurationValidator.sanitizeAndValidate(config);
  }

  /**
   * Obtiene la lista de proveedores soportados
   */
  static getSupportedProviders(): ApiProvider[] {
    return Object.keys(this.PROVIDER_FIELD_MAPPING) as ApiProvider[];
  }

  /**
   * Verifica si un proveedor está soportado
   */
  static isProviderSupported(provider: string): boolean {
    return provider in this.PROVIDER_FIELD_MAPPING;
  }
}
