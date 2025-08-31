import { ApiProvider } from "./api";

/**
 * Configuración normalizada que espera el frontend
 * Esta interfaz define la estructura estándar que usa la UI
 */
export interface FrontendConfiguration {
  // Configuración del modelo
  model?: string;
  provider?: ApiProvider;

  // Autenticación
  apiKey?: string;
  baseUrl?: string;
  authHeader?: string;

  // Parámetros del modelo
  temperature?: number;
  maxTokens?: number;

  // Configuraciones de seguridad
  autoApproveRead?: boolean;
  autoApproveList?: boolean;
  autoRunCommands?: boolean;
  confirmDangerous?: boolean;

  // Configuraciones de memoria
  persistentMemory?: boolean; // Si mantener memoria entre conversaciones
}

/**
 * Resultado de validación
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuración con metadatos de versión
 */
export interface VersionedConfiguration {
  version: number;
  data: FrontendConfiguration;
  lastUpdated: string;
}
