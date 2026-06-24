import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenRouter } from "@langchain/openrouter";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { DynamicStructuredTool } from "@langchain/core/tools";

export interface CreateChatModelOptions {
  provider: string; // 'openai' | 'google-genai' | 'anthropic' | 'openrouter'
  model: string;
  temperature?: number;
  apiKey: string;
}

/**
 * Creates a language model instance dynamically based on the provider and user key (BYOK).
 * All providers require the user to supply their own API key.
 */
export function createChatModel({
  provider,
  model,
  temperature = 0.5,
  apiKey,
}: CreateChatModelOptions): BaseChatModel {
  const normProvider = provider.toLowerCase();

  if (normProvider === "openrouter" || normProvider.includes("openrouter")) {
    return new ChatOpenRouter({
      model,
      temperature,
      apiKey,
    });
  } else if (normProvider === "openai" || normProvider.includes("openai")) {
    return new ChatOpenAI({
      model,
      temperature,
      apiKey,
    });
  } else if (normProvider === "anthropic" || normProvider.includes("anthropic")) {
    return new ChatAnthropic({
      model,
      temperature,
      apiKey,
    });
  } else {
    // Default to Google Gemini
    return new ChatGoogleGenerativeAI({
      model,
      temperature,
      apiKey,
    });
  }
}

/**
 * JSON Schema keywords that are not supported by Google Gemini's function calling API.
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
  "additionalProperties",
  "patternProperties",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  "contentMediaType",
  "contentEncoding",
  "examples",
  "default",
  "const",
  "readOnly",
  "writeOnly",
  "deprecated",
  "title",
  "format",
]);

function normalizeType(type: unknown): string | undefined {
  if (typeof type === "string") {
    return type;
  }
  if (Array.isArray(type)) {
    const nonNullTypes = type.filter((t) => t !== "null");
    if (nonNullTypes.length > 0) {
      return nonNullTypes[0] as string;
    }
    return "string";
  }
  return undefined;
}

/**
 * Recursively sanitizes schema parameters for Gemini.
 */
function sanitizeSchema(schema: unknown): Record<string, unknown> | unknown {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => sanitizeSchema(item));
  }

  const schemaObj = schema as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schemaObj)) {
    if (UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) {
      continue;
    }

    if (key === "type") {
      const normalizedType = normalizeType(value);
      if (normalizedType) {
        sanitized[key] = normalizedType;
      }
      continue;
    }

    if (key === "items" && Array.isArray(value)) {
      if (value.length > 0) {
        sanitized[key] = sanitizeSchema(value[0]);
      }
      continue;
    }

    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const propsObj = value as Record<string, unknown>;
      const sanitizedProps: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(propsObj)) {
        sanitizedProps[propName] = sanitizeSchema(propSchema);
      }
      sanitized[key] = sanitizedProps;
      continue;
    }

    if (key === "required" && Array.isArray(value)) {
      const properties = schemaObj["properties"];
      if (properties && typeof properties === "object" && !Array.isArray(properties)) {
        const validProps = Object.keys(properties as Record<string, unknown>);
        const filtered = value.filter(
          (prop) => typeof prop === "string" && validProps.includes(prop)
        );
        if (filtered.length > 0) {
          sanitized[key] = filtered;
        }
      } else {
        sanitized[key] = value;
      }
      continue;
    }

    if (value && typeof value === "object") {
      sanitized[key] = sanitizeSchema(value);
    } else {
      sanitized[key] = value;
    }
  }

  if (
    "properties" in sanitized &&
    typeof sanitized["properties"] === "object" &&
    sanitized["properties"] !== null &&
    Object.keys(sanitized["properties"] as Record<string, unknown>).length === 0
  ) {
    delete sanitized["properties"];
    delete sanitized["required"];
  }

  return sanitized;
}

/**
 * Sanitizes a DynamicStructuredTool's schema in place for Gemini function calling.
 */
export function sanitizeTool(tool: DynamicStructuredTool): DynamicStructuredTool {
  const originalSchema = tool.schema as Record<string, unknown>;
  const sanitizedSchema = sanitizeSchema(originalSchema) as Record<string, unknown>;

  const toolObj = tool as unknown as Record<string, unknown>;
  toolObj.schema = sanitizedSchema;
  const lcKwargs = toolObj.lc_kwargs as Record<string, unknown> | undefined;
  if (lcKwargs?.schema) {
    lcKwargs.schema = sanitizedSchema;
  }

  return tool;
}
