import OpenAI from "openai";
import { ApiHandler } from "../index";
import { ApiStream } from "../transform/stream";
import { ModelInfo } from "../../../shared/api";

interface OpenAiNativeHandlerOptions {
  openAiNativeApiKey?: string;
  openAiNativeBaseUrl?: string;
  apiModelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAiNativeHandler implements ApiHandler {
  private options: OpenAiNativeHandlerOptions;
  private client: OpenAI | undefined;

  constructor(options: OpenAiNativeHandlerOptions) {
    this.options = options;
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      if (!this.options.openAiNativeApiKey) {
        throw new Error("OpenAI API key is required");
      }

      this.client = new OpenAI({
        apiKey: this.options.openAiNativeApiKey,
        baseURL:
          this.options.openAiNativeBaseUrl || "https://api.openai.com/v1",
      });
    }
    return this.client;
  }

  async *createMessage(systemPrompt: string, messages: any[]): ApiStream {
    const client = this.ensureClient();
    const model = this.getModel();

    // Convert Anthropic-style messages to OpenAI format
    const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        { role: "system", content: systemPrompt },
        ...messages.map((msg) => {
          if (msg.role === "user") {
            return {
              role: "user" as const,
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            };
          } else if (msg.role === "assistant") {
            return {
              role: "assistant" as const,
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            };
          }
          return {
            role: msg.role as "user" | "assistant",
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
          };
        }),
      ];

    try {
      const stream = await client.chat.completions.create({
        model: model.id,
        messages: openAiMessages,
        max_tokens: this.options.maxTokens || model.info.maxTokens || 4096,
        temperature: this.options.temperature ?? 0.7,
        stream: true,
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for await (const chunk of stream) {
        if (!chunk.choices || chunk.choices.length === 0) {
          continue;
        }

        const choice = chunk.choices[0];

        // Handle usage information
        if (chunk.usage) {
          totalInputTokens = chunk.usage.prompt_tokens || 0;
          totalOutputTokens = chunk.usage.completion_tokens || 0;

          yield {
            type: "usage",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cacheWriteTokens: 0,
            cacheReadTokens: 0,
          };
        }

        // Handle text content
        if (choice.delta?.content) {
          yield {
            type: "text",
            text: choice.delta.content,
          };
        }

        // Handle function/tool calls (if supported in the future)
        if (choice.delta?.tool_calls) {
          for (const toolCall of choice.delta.tool_calls) {
            if (toolCall.function?.name && toolCall.function?.arguments) {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                yield {
                  type: "text",
                  text: `<${toolCall.function.name}>\n${JSON.stringify(args, null, 2)}\n</${toolCall.function.name}>`,
                };
              } catch (e) {
                // If parsing fails, just yield the raw arguments
                yield {
                  type: "text",
                  text: `<${toolCall.function.name}>\n${toolCall.function.arguments}\n</${toolCall.function.name}>`,
                };
              }
            }
          }
        }

        // Handle finish reason
        if (choice.finish_reason) {
          // Final usage update
          yield {
            type: "usage",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cacheWriteTokens: 0,
            cacheReadTokens: 0,
          };
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    const modelId = this.options.apiModelId || "gpt-4o";

    // Create a basic model info for OpenAI models
    const modelInfo: ModelInfo = {
      maxTokens: 4096,
      contextWindow: 128000,
      supportsImages: true,
      supportsPromptCache: false,
      inputPrice: 2.5,
      outputPrice: 10.0,
    };

    // Adjust based on specific model
    if (modelId === "gpt-3.5-turbo") {
      modelInfo.maxTokens = 4096;
      modelInfo.contextWindow = 16385;
      modelInfo.supportsImages = false;
      modelInfo.inputPrice = 0.5;
      modelInfo.outputPrice = 1.5;
    } else if (modelId === "gpt-4") {
      modelInfo.maxTokens = 4096;
      modelInfo.contextWindow = 8192;
      modelInfo.supportsImages = false;
      modelInfo.inputPrice = 30.0;
      modelInfo.outputPrice = 60.0;
    } else if (modelId === "gpt-4o-mini") {
      modelInfo.maxTokens = 16384;
      modelInfo.inputPrice = 0.15;
      modelInfo.outputPrice = 0.6;
    }

    return { id: modelId, info: modelInfo };
  }
}
