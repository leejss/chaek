import { PromptRegistry, PromptSpec, ObjectPromptSpec } from "./types";
import { generateText, Output, streamText, LanguageModel } from "ai";

/**
 * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
 */
export type StreamTextResult = ReturnType<typeof streamText>;

class Registry implements PromptRegistry {
  // Map은 invariant하므로 any를 사용하여 variance 문제를 해결합니다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private specs: Map<string, PromptSpec<any, any>> = new Map();

  register<I, O>(spec: PromptSpec<I, O>): void {
    const key = `${spec.id}@${spec.version}`;
    if (this.specs.has(key)) {
      console.warn(`Overwriting spec for ${key}`);
    }
    this.specs.set(key, spec);
  }

  getSpec<I, O>(id: string, version: string): PromptSpec<I, O> | undefined {
    const key = `${id}@${version}`;
    return this.specs.get(key) as PromptSpec<I, O> | undefined;
  }

  /**
   * Function overloading: kind가 "object"일 때는 Promise<O>를 반환
   */
  async runSpec<I, O>(
    id: string,
    version: string,
    input: I,
    model: LanguageModel,
    kind: "object",
  ): Promise<O>;

  /**
   * Function overloading: kind가 "text"일 때는 Promise<string>을 반환 (스트리밍 아님)
   */
  async runSpec<I>(
    id: string,
    version: string,
    input: I,
    model: LanguageModel,
    kind: "text",
  ): Promise<string>;

  /**
   * Function overloading: kind가 "stream"일 때는 StreamTextResult를 반환 (스트리밍)
   */
  runSpec<I>(
    id: string,
    version: string,
    input: I,
    model: LanguageModel,
    kind: "stream",
  ): Promise<StreamTextResult>;

  /**
   * Function overloading: kind를 명시하지 않을 때의 기본 동작
   * spec의 kind를 기반으로 자동으로 판단
   */
  async runSpec<I, O>(
    id: string,
    version: string,
    input: I,
    model: LanguageModel,
  ): Promise<O | string | StreamTextResult>;

  /**
   * 실제 구현체
   * spec의 kind에 따라 적절한 AI SDK 함수를 호출하고 결과를 반환합니다.
   */
  async runSpec<I, O>(
    id: string,
    version: string,
    input: I,
    model: LanguageModel,
    kind?: "object" | "text" | "stream",
  ): Promise<O | string | StreamTextResult> {
    const spec = this.getSpec<I, O>(id, version);
    if (!spec) {
      throw new Error(`Spec ${id}@${version} not found`);
    }

    // kind 파라미터가 있으면 검증
    if (kind && spec.kind !== kind) {
      throw new Error(
        `Spec ${id}@${version} has kind ${spec.kind}, but ${kind} was requested`,
      );
    }

    const messages = spec.buildMessages(input);
    const selectedModel = model || spec.defaultModel;

    if (!selectedModel) {
      throw new Error("Model is required but not provided");
    }

    // Discriminated union을 통한 타입 좁히기 (Type Narrowing)
    if (spec.kind === "object") {
      const objectSpec = spec as ObjectPromptSpec<I, O>;
      const result = await generateText({
        model: selectedModel,
        messages: messages,
        output: Output.object({ schema: objectSpec.schema }),
      });

      return result.output as O;
    } else if (spec.kind === "text") {
      // kind: "text"는 스트리밍이 아닌 일반 텍스트 생성
      const result = await generateText({
        model: selectedModel,
        messages: messages,
      });

      return result.text;
    } else if (spec.kind === "stream") {
      // 호출자가 .toTextStreamResponse() 또는 .textStream 등을 사용할 수 있습니다
      return streamText({
        model: selectedModel,
        messages: messages,
      });
    }

    // Exhaustive check: 모든 케이스를 처리했으므로 여기에 도달하면 안 됩니다.
    const _exhaustiveCheck: never = spec;
    throw new Error(
      `Unsupported spec kind. This should never happen: ${JSON.stringify(
        _exhaustiveCheck,
      )}`,
    );
  }
}

export const registry = new Registry();
