import { z } from "zod";
import { LanguageModel, ModelMessage } from "ai";

export type PromptKind = "object" | "text" | "stream";

/**
 * PromptSpec for structured object output (kind: "object")
 * Output 타입이 명시되고 schema가 required입니다.
 * generateText를 사용하여 구조화된 객체를 생성합니다.
 */
export interface ObjectPromptSpec<Input, Output> {
  id: string;
  version: string;
  kind: "object";
  description?: string;
  schema: z.ZodType<Output>;
  buildMessages: (input: Input) => ModelMessage[];
  defaultModel?: LanguageModel;
}

/**
 * PromptSpec for non-streaming text output (kind: "text")
 * generateText를 사용하여 일반 텍스트를 생성합니다 (스트리밍 아님).
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
 * streamText를 사용하여 텍스트를 스트리밍 방식으로 생성합니다.
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
 * kind 필드를 통해 타입이 자동으로 추론됩니다.
 */
export type PromptSpec<Input = unknown, Output = unknown> =
  | ObjectPromptSpec<Input, Output>
  | TextPromptSpec<Input>
  | StreamPromptSpec<Input>;

export interface PromptRegistry {
  register<I, O>(spec: PromptSpec<I, O>): void;
  getSpec<I, O>(id: string, version: string): PromptSpec<I, O> | undefined;
}
