import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiConfiguration, ModelInfo } from "../../shared/api";
import { Mode } from "../../shared/storage/types";
import { AnthropicHandler } from "./providers/anthropic";
import { OpenAiNativeHandler } from "./providers/openai";
import { GenAiHandler } from "./providers/genai";
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream";

export interface ApiHandler {
  createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream;
  getModel(): ApiHandlerModel;
  getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>;
}

export interface ApiHandlerModel {
  id: string;
  info: ModelInfo;
}

export interface ApiProviderInfo {
  provider: string;
  model: string;
}

/**
 * API handler builder that supports Anthropic, OpenAI, and GenAI
 */
export function buildApiHandler(
  configuration: ApiConfiguration,
  mode: Mode,
): ApiHandler {
  // Determine the API provider based on mode
  const apiProvider =
    mode === "plan"
      ? configuration.planModeApiProvider
      : configuration.actModeApiProvider;

  switch (apiProvider) {
    case "anthropic":
      return new AnthropicHandler(configuration);

    case "openai-native":
      return new OpenAiNativeHandler({
        openAiNativeApiKey: configuration.openAiNativeApiKey,
        openAiNativeBaseUrl: configuration.openAiNativeBaseUrl,
        apiModelId: configuration.actModeApiModelId, // Use act mode model for now
        temperature: configuration.temperature,
        maxTokens: configuration.maxTokens,
      });

    case "genai":
      return new GenAiHandler({
        genAiApiKey: configuration.genAiApiKey,
        genAiBaseUrl: configuration.genAiBaseUrl,
        authHeader: configuration.authHeader,
        apiModelId: configuration.actModeApiModelId, // Use act mode model for now
        temperature: configuration.temperature,
        maxTokens: configuration.maxTokens,
      });

    default:
      throw new Error(
        `Unsupported API provider: ${apiProvider}. Supported providers: anthropic, openai-native, genai`,
      );
  }
}
