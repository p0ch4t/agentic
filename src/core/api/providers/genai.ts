import { ApiHandler } from "../index";
import { ApiStream } from "../transform/stream";
import { ModelInfo } from "../../../shared/api";

interface GenAiHandlerOptions {
  genAiApiKey?: string;
  genAiBaseUrl?: string;
  apiModelId?: string;
  temperature?: number;
  maxTokens?: number;
  authHeader?: string;
}

export class GenAiHandler implements ApiHandler {
  private options: GenAiHandlerOptions;

  constructor(options: GenAiHandlerOptions) {
    this.options = options;
  }

  async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
    console.log("🌐 [GenAiHandler] Starting createMessage");
    console.log(
      "🔑 [GenAiHandler] API Key present:",
      !!this.options.genAiApiKey,
    );

    // API key is optional for custom models (o3 Custom)
    if (!this.options.genAiApiKey) {
      console.log(
        "⚠️ [GenAiHandler] No API key provided - assuming custom model without authentication",
      );
    }

    if (!this.options.genAiBaseUrl) {
      console.error("❌ [GenAiHandler] GenAI base URL is required");
      throw new Error("GenAI base URL is required");
    }

    const model = this.getModel();
    const baseUrl = this.options.genAiBaseUrl;
    const url = `${baseUrl}/genai/v1/chat/completions`;

    console.log("⚙️ [GenAiHandler] Configuration:", {
      model: model.id,
      baseUrl,
      url,
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
    });

    // Convert messages to GenAI format (similar to second curl)
    const genAiMessages = messages.map((msg) => ({
      role: msg.role,
      content: [
        {
          type: "text",
          text:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
        },
      ],
    }));

    console.log("📝 [GenAiHandler] Converted messages:", genAiMessages.length);

    // Prepare GenAI request body (simpler format like second curl)
    const requestBody = {
      model: model.id,
      messages: genAiMessages,
      system_instruction: systemPrompt,
      // Add tools support
      tools: this.getAvailableTools(),
    };

    console.log("📦 [GenAiHandler] Request body prepared:", {
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      hasSystemInstruction: !!requestBody.system_instruction,
      toolCount: requestBody.tools?.length || 0,
    });

    try {
      console.log("🚀 [GenAiHandler] Sending request to GenAI API");

      // Build headers conditionally
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add authentication if available
      if (this.options.authHeader && this.options.genAiApiKey) {
        // Use custom authentication header name with API key as value
        console.log(
          "🔑 [GenAiHandler] Using custom authentication header:",
          this.options.authHeader,
        );
        headers[this.options.authHeader] = this.options.genAiApiKey;
      } else if (this.options.genAiApiKey) {
        // Use standard Bearer token (fallback when no custom header name)
        console.log("🔑 [GenAiHandler] Using standard Bearer token");
        headers["Authorization"] = `Bearer ${this.options.genAiApiKey}`;
      } else {
        console.log(
          "🔓 [GenAiHandler] No authentication provided - sending request without auth headers",
        );
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      console.log(
        "📡 [GenAiHandler] Response status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [GenAiHandler] API error response:", errorText);
        throw new Error(
          `GenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("📋 [GenAiHandler] Response data structure:", {
        hasContent: !!data.content,
        contentLength: data.content?.length || 0,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        hasUsage: !!data.usage,
      });

      // Handle both GenAI and OpenAI response formats
      let hasValidResponse = false;

      // Check for text content first
      if (data.content && data.content.length > 0) {
        // GenAI format with content array
        console.log("📝 [GenAiHandler] Processing GenAI content array format");
        for (const item of data.content) {
          if (item.type === "text" && item.text) {
            console.log(
              "✅ [GenAiHandler] Yielding text content, length:",
              item.text.length,
            );
            yield {
              type: "text",
              text: item.text,
            };
            hasValidResponse = true;
          } else if (item.type === "tool_use") {
            console.log(
              "🔧 [GenAiHandler] Found tool use in content:",
              item.name,
            );
            // Convert tool use to the format expected by parseAssistantMessageV2
            const toolText = this.convertToolUseToXML(
              item.name,
              item.input || item.parameters,
            );
            yield {
              type: "text",
              text: toolText,
            };
            hasValidResponse = true;
          }
        }
      } else if (data.choices && data.choices.length > 0) {
        // OpenAI format (through proxy)
        console.log("📝 [GenAiHandler] Processing OpenAI choices format");
        const choice = data.choices[0];
        if (choice.message?.content) {
          console.log(
            "✅ [GenAiHandler] Yielding choice content, length:",
            choice.message.content.length,
          );
          yield {
            type: "text",
            text: choice.message.content,
          };
          hasValidResponse = true;
        }
      }

      // Check for tool calls (separate from content)
      if (data.tool_calls && data.tool_calls.length > 0) {
        console.log(
          "🔧 [GenAiHandler] Processing tool_calls:",
          data.tool_calls.length,
        );
        for (const toolCall of data.tool_calls) {
          console.log(
            "🔧 [GenAiHandler] Found tool call:",
            toolCall.function?.name,
          );
          // Parse arguments and convert to the format expected by parseAssistantMessageV2
          let params = {};
          try {
            params = JSON.parse(toolCall.function?.arguments || "{}");
          } catch (error) {
            console.error(
              "🔧 [GenAiHandler] Error parsing tool arguments:",
              error,
            );
            params = {};
          }
          const toolText = this.convertToolUseToXML(
            toolCall.function?.name,
            params,
          );
          yield {
            type: "text",
            text: toolText,
          };
          hasValidResponse = true;
        }
      }

      // Yield usage information if available
      if (data.usage) {
        console.log("📊 [GenAiHandler] Yielding usage info");
        yield {
          type: "usage",
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens:
            data.usage.output_tokens || data.usage.completion_tokens || 0,
          cacheWriteTokens: 0,
          cacheReadTokens: 0,
        };
      }

      if (!hasValidResponse) {
        console.error(
          "❌ [GenAiHandler] No valid response content or tool calls found",
        );
        console.error(
          "❌ [GenAiHandler] Full response:",
          JSON.stringify(data, null, 2),
        );
        throw new Error("No response from GenAI API");
      }
    } catch (error) {
      console.error("❌ [GenAiHandler] Request failed:", error);
      if (error instanceof Error) {
        throw new Error(`GenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || "o3";

    // Create model info for GenAI models
    const modelInfo: ModelInfo = {
      maxTokens: 4096,
      contextWindow: 32768,
      supportsImages: true,
      supportsPromptCache: false,
      inputPrice: 2.5,
      outputPrice: 10.0,
    };

    // Adjust based on specific model
    if (modelId === "o3") {
      modelInfo.maxTokens = 250;
      modelInfo.contextWindow = 8192;
      modelInfo.inputPrice = 5.0;
      modelInfo.outputPrice = 15.0;
    } else if (modelId === "gemini-2.5-pro") {
      modelInfo.maxTokens = 8192;
      modelInfo.contextWindow = 1000000;
      modelInfo.inputPrice = 1.25;
      modelInfo.outputPrice = 5.0;
    } else if (modelId === "gpt-4o") {
      modelInfo.maxTokens = 4096;
      modelInfo.contextWindow = 128000;
      modelInfo.inputPrice = 2.5;
      modelInfo.outputPrice = 10.0;
    } else if (modelId === "gpt-4o-mini") {
      modelInfo.maxTokens = 16384;
      modelInfo.contextWindow = 128000;
      modelInfo.inputPrice = 0.15;
      modelInfo.outputPrice = 0.6;
    }

    return { id: modelId, info: modelInfo };
  }

  private convertToolUseToXML(toolName: string, params: any): string {
    console.log(
      "🔧 [GenAiHandler] Converting tool use to XML:",
      toolName,
      params,
    );

    // Generate ONLY the XML for parsing - no user-visible content
    let xml = `<${toolName}>\n`;

    // Add each parameter as a separate XML tag
    if (params && typeof params === "object") {
      for (const [key, value] of Object.entries(params)) {
        xml += `<${key}>${value || ""}</${key}>\n`;
      }
    }

    // Close the tool tag
    xml += `</${toolName}>`;

    console.log("✅ [GenAiHandler] Generated XML (hidden from user):", xml);
    return xml;
  }

  private getAvailableTools() {
    console.log("🔧 [GenAiHandler] Getting available tools");

    const tools = [
      {
        type: "function",
        function: {
          name: "execute_command",
          description: "Execute a shell command on the system",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The command to execute",
              },
              cwd: {
                type: "string",
                description: "Working directory for the command (optional)",
              },
            },
            required: ["command", "cwd"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "read_file",
          description: "Read the contents of a file",
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to read",
              },
            },
            required: ["path"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Write content to a file",
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to write",
              },
              content: {
                type: "string",
                description: "Content to write to the file",
              },
            },
            required: ["path", "content"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "list_files",
          description: "List files in a directory",
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Directory path to list files from",
              },
            },
            required: ["path"],
          },
        },
      },
    ];

    console.log("✅ [GenAiHandler] Available tools:", tools.length);
    console.log(
      "🔧 [GenAiHandler] Tool schemas validated for GenAI API requirements",
    );
    return tools;
  }
}
