import { FrontendConfiguration } from "../../shared/FrontendConfiguration";

/**
 * Logger especializado para operaciones de configuración
 * Proporciona logging estructurado y seguro (sin exponer API keys)
 */
export class ConfigurationLogger {

  /**
   * Sanitiza una configuración para logging (oculta información sensible)
   */
  private static sanitizeForLogging(config: any): any {
    if (!config) return null;

    const sanitized = { ...config };

    // Ocultar información sensible pero mostrar si está presente
    if (sanitized.apiKey) {
      sanitized.apiKey = sanitized.apiKey.length > 0 ? '***PRESENT***' : '***EMPTY***';
    }

    if (sanitized.authHeader) {
      sanitized.authHeader = sanitized.authHeader.length > 0 ? '***PRESENT***' : '***EMPTY***';
    }

    // Truncar URLs largas pero mantener información útil
    if (sanitized.baseUrl && sanitized.baseUrl.length > 50) {
      sanitized.baseUrl = sanitized.baseUrl.substring(0, 47) + '...';
    }

    return sanitized;
  }

  /**
   * Log de cambio de configuración
   */
  static logConfigurationChange(
    before: FrontendConfiguration | null,
    after: FrontendConfiguration,
    operation: string
  ): void {
    const timestamp = new Date().toISOString();

    console.log(`🔧 [ConfigurationLogger] ${operation}:`, {
      timestamp,
      operation,
      before: this.sanitizeForLogging(before),
      after: this.sanitizeForLogging(after),
      changes: this.detectChanges(before, after)
    });
  }

  /**
   * Log de validación de configuración
   */
  static logValidation(
    config: FrontendConfiguration,
    isValid: boolean,
    errors: string[],
    warnings: string[]
  ): void {
    const level = !isValid ? 'ERROR' : warnings.length > 0 ? 'WARN' : 'INFO';
    const emoji = !isValid ? '❌' : warnings.length > 0 ? '⚠️' : '✅';

    console.log(`${emoji} [ConfigurationLogger] Validation ${level}:`, {
      timestamp: new Date().toISOString(),
      config: this.sanitizeForLogging(config),
      isValid,
      errors,
      warnings
    });
  }

  /**
   * Log de error de configuración
   */
  static logConfigurationError(
    operation: string,
    error: Error,
    config?: FrontendConfiguration
  ): void {
    console.error(`💥 [ConfigurationLogger] Error in ${operation}:`, {
      timestamp: new Date().toISOString(),
      operation,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      config: config ? this.sanitizeForLogging(config) : null
    });
  }

  /**
   * Log de carga de configuración
   */
  static logConfigurationLoad(config: FrontendConfiguration | null): void {
    if (config) {
      console.log(`📥 [ConfigurationLogger] Configuration loaded:`, {
        timestamp: new Date().toISOString(),
        config: this.sanitizeForLogging(config),
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey,
        hasBaseUrl: !!config.baseUrl
      });
    } else {
      console.log(`📥 [ConfigurationLogger] No configuration found - using defaults`);
    }
  }

  /**
   * Log de guardado de configuración
   */
  static logConfigurationSave(config: FrontendConfiguration): void {
    console.log(`💾 [ConfigurationLogger] Configuration saved:`, {
      timestamp: new Date().toISOString(),
      config: this.sanitizeForLogging(config),
      provider: config.provider,
      model: config.model
    });
  }

  /**
   * Detecta cambios específicos entre dos configuraciones
   */
  private static detectChanges(
    before: FrontendConfiguration | null,
    after: FrontendConfiguration
  ): string[] {
    const changes: string[] = [];

    if (!before) {
      changes.push('Initial configuration');
      return changes;
    }

    // Detectar cambios importantes
    if (before.provider !== after.provider) {
      changes.push(`Provider: ${before.provider} → ${after.provider}`);
    }

    if (before.model !== after.model) {
      changes.push(`Model: ${before.model} → ${after.model}`);
    }

    if (!!before.apiKey !== !!after.apiKey) {
      changes.push(`API Key: ${!!before.apiKey ? 'present' : 'missing'} → ${!!after.apiKey ? 'present' : 'missing'}`);
    }

    if (before.baseUrl !== after.baseUrl) {
      changes.push(`Base URL: ${before.baseUrl || 'none'} → ${after.baseUrl || 'none'}`);
    }

    if (before.temperature !== after.temperature) {
      changes.push(`Temperature: ${before.temperature} → ${after.temperature}`);
    }

    if (before.maxTokens !== after.maxTokens) {
      changes.push(`Max Tokens: ${before.maxTokens} → ${after.maxTokens}`);
    }

    // Cambios de seguridad
    if (before.autoRunCommands !== after.autoRunCommands) {
      changes.push(`Auto-run: ${before.autoRunCommands} → ${after.autoRunCommands}`);
    }

    if (before.confirmDangerous !== after.confirmDangerous) {
      changes.push(`Confirm Dangerous: ${before.confirmDangerous} → ${after.confirmDangerous}`);
    }

    return changes.length > 0 ? changes : ['No significant changes'];
  }

  /**
   * Log de estadísticas de uso de configuración
   */
  static logConfigurationStats(stats: {
    totalConfigurations: number;
    providerDistribution: Record<string, number>;
    averageTemperature: number;
    averageMaxTokens: number;
  }): void {
    console.log(`📊 [ConfigurationLogger] Configuration statistics:`, {
      timestamp: new Date().toISOString(),
      ...stats
    });
  }

  /**
   * Log de migración de configuración
   */
  static logConfigurationMigration(
    fromVersion: number,
    toVersion: number,
    changes: string[]
  ): void {
    console.log(`🔄 [ConfigurationLogger] Configuration migrated:`, {
      timestamp: new Date().toISOString(),
      fromVersion,
      toVersion,
      changes
    });
  }
}
