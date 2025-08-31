export type AssistantMessageContent = TextContent | ToolUse;

export { parseAssistantMessageV2 } from "./parse-assistant-message";

export interface TextContent {
  type: "text";
  content: string;
  partial: boolean;
}

export const toolUseNames = [
  // 🔒 CORE APPSEC FUNCTIONS
  "execute_command",        // ⭐ CRÍTICO: curl, nmap, burp, etc.
  "read_file",             // ⭐ CRÍTICO: Análisis de código fuente
  "write_to_file",         // ⭐ CRÍTICO: Generar reportes, payloads
  "search_files",          // ⭐ CRÍTICO: Buscar vulnerabilidades en código
  "list_files",            // ⭐ CRÍTICO: Explorar estructura de aplicaciones

  // 🌐 WEB PENTESTING
  "web_fetch",             // ⭐ CRÍTICO: HTTP requests, análisis de respuestas

  // 🧠 MEMORIA Y CONTEXTO
  "create_memory",         // ⭐ CRÍTICO: Recordar vulnerabilidades encontradas
  "update_memory",         // ⭐ CRÍTICO: Actualizar hallazgos
  "delete_memory",         // Limpiar información obsoleta
  "search_memories",       // ⭐ CRÍTICO: Buscar vulnerabilidades previas

  // 🔧 MCP TOOLS (Para herramientas externas)
  "use_mcp_tool",          // ⭐ CRÍTICO: Integrar Burp, OWASP ZAP, etc.
  "access_mcp_resource",   // Acceder a recursos de herramientas
] as const;

// Converts array of tool call names into a union type ("execute_command" | "read_file" | ...)
export type ToolUseName = (typeof toolUseNames)[number];

export const toolParamNames = [
  "command",
  "requires_approval",
  "path",
  "content",
  "diff",
  "regex",
  "file_pattern",
  "recursive",
  "action",
  "url",
  "coordinate",
  "text",
  "server_name",
  "tool_name",
  "arguments",
  "uri",
  "question",
  "options",
  "response",
  "result",
  "context",
  "title",
  "what_happened",
  "steps_to_reproduce",
  "api_request_output",
  "additional_context",
  "needs_more_exploration",
  "task_progress",
] as const;

export type ToolParamName = (typeof toolParamNames)[number];

export interface ToolUse {
  type: "tool_use";
  name: ToolUseName;
  // params is a partial record, allowing only some or none of the possible parameters to be used
  params: Partial<Record<ToolParamName, string>>;
  partial: boolean;
}
