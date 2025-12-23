import { z } from "zod";
import { LanguageModel, ModelMessage, streamText } from "ai";

export type PromptKind = "object" | "text" | "stream";

export type StreamTextResult = ReturnType<typeof streamText>;

export interface PromptDefinition {
  input: unknown;
  output: unknown;
}

/**
 * 전역 프롬프트 레지스트리 맵 인터페이스입니다.
 * 각 스펙 파일에서 Module Augmentation을 통해 확장합니다.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PromptRegistryMap {}

export type PromptId = keyof PromptRegistryMap;

/**
 * PromptSpec for structured object output (kind: "object")
 */
export interface ObjectPromptSpec<Input, Output> {
  id: string; // 구체적인 ID는 구현체에서 정의하지만, 타입 추론을 위해 string으로 유지
  version: string;
  kind: "object";
  description?: string;
  schema: z.ZodType<Output>;
  buildMessages: (input: Input) => ModelMessage[];
  defaultModel?: LanguageModel;
}

/**
 * PromptSpec for non-streaming text output (kind: "text")
 */
export interface TextPromptSpec<Input> {
  id: string;
  version: string;
  kind: "text";
  description?: string;
  buildMessages: (input: Input) => ModelMessage[];
  defaultModel?: LanguageModel;
}

/**
 * PromptSpec for streaming text output (kind: "stream")
 */
export interface StreamPromptSpec<Input> {
  id: string;
  version: string;
  kind: "stream";
  description?: string;
  buildMessages: (input: Input) => ModelMessage[];
  defaultModel?: LanguageModel;
}

/**
 * Discriminated union of all PromptSpec types
 */
export type PromptSpec<Input = unknown, Output = unknown> =
  | ObjectPromptSpec<Input, Output>
  | TextPromptSpec<Input>
  | StreamPromptSpec<Input>;

export interface PromptRegistry {
  register<I, O>(spec: PromptSpec<I, O>): void;
  getSpec<I, O>(id: string, version: string): PromptSpec<I, O> | undefined;
}
