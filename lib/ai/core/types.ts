import { z } from "zod";
// Using any for model to avoid import issues with specific AI SDK versions
// import { LanguageModelV1, CoreMessage } from "ai";

export type PromptKind = "object" | "text" | "chat";

// Define compatible CoreMessage type
export type CoreMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<any>;
};

export interface PromptSpec<Input = any, Output = any> {
  id: string;
  version: string;
  kind: PromptKind;
  description?: string;

  // Optional schema for structured output
  schema?: z.ZodType<Output>;

  // Function to build messages from input
  buildMessages: (input: Input) => CoreMessage[];

  // Optional: default model if none provided at runtime
  defaultModel?: any;
}

export interface PromptRegistry {
  register<I, O>(spec: PromptSpec<I, O>): void;
  getSpec<I, O>(id: string, version: string): PromptSpec<I, O> | undefined;
}
