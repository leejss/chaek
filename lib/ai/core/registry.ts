import {
  PromptRegistry,
  PromptSpec,
  PromptRegistryMap,
  PromptId,
  StreamTextResult,
} from "./types";
import { generateText, Output, streamText, LanguageModel } from "ai";

class Registry implements PromptRegistry {
  private specs: Map<string, PromptSpec<unknown, unknown>> = new Map();

  register<I, O>(spec: PromptSpec<I, O>): void {
    const key = `${spec.id}@${spec.version}`;
    if (this.specs.has(key)) {
      console.warn(`Overwriting spec for ${key}`);
    }
    this.specs.set(key, spec as PromptSpec<unknown, unknown>);
  }

  getSpec<I, O>(id: string, version: string): PromptSpec<I, O> | undefined {
    const key = `${id}@${version}`;
    return this.specs.get(key) as PromptSpec<I, O> | undefined;
  }

  /**
   * Function overloading: kind가 "object"일 때는 Promise<O>를 반환
   */
  async runSpec<K extends PromptId>(
    id: K,
    input: PromptRegistryMap[K]["input"],
    model: LanguageModel,
    kind: "object",
  ): Promise<PromptRegistryMap[K]["output"]>;

  /**
   * Function overloading: kind가 "text"일 때는 Promise<string>을 반환 (스트리밍 아님)
   */
  async runSpec<K extends PromptId>(
    id: K,
    input: PromptRegistryMap[K]["input"],
    model: LanguageModel,
    kind: "text",
  ): Promise<string>;

  /**
   * Function overloading: kind가 "stream"일 때는 StreamTextResult를 반환 (스트리밍)
   */
  async runSpec<K extends PromptId>(
    id: K,
    input: PromptRegistryMap[K]["input"],
    model: LanguageModel,
    kind: "stream",
  ): Promise<StreamTextResult>;

  async runSpec<K extends PromptId>(
    id: K,
    input: PromptRegistryMap[K]["input"],
    model: LanguageModel,
    kind?: "object" | "text" | "stream",
  ): Promise<unknown> {
    // id를 'specId@version' 형식으로 파싱
    const [specId, version] = (id as string).split("@");

    if (!specId || !version) {
      throw new Error(
        `Invalid PromptId format: ${id}. Expected 'specId@version'`,
      );
    }

    const spec = this.getSpec(specId, version);

    if (!spec) {
      throw new Error(`Spec ${id} not found`);
    }

    // kind 파라미터가 있으면 검증
    if (kind && spec.kind !== kind) {
      throw new Error(
        `Spec ${id} has kind ${spec.kind}, but ${kind} was requested`,
      );
    }

    const messages = spec.buildMessages(input);
    const selectedModel = model || spec.defaultModel;

    if (!selectedModel) {
      throw new Error("Model is required but not provided");
    }

    if (spec.kind === "object") {
      const result = await generateText({
        model: selectedModel,
        messages: messages,
        output: Output.object({ schema: spec.schema }),
      });

      return result.output;
    } else if (spec.kind === "text") {
      const result = await generateText({
        model: selectedModel,
        messages: messages,
      });

      return result.text;
    } else if (spec.kind === "stream") {
      return streamText({
        model: selectedModel,
        messages: messages,
      });
    }

    const _exhaustiveCheck: never = spec;
    throw new Error(
      `Unsupported spec kind: ${JSON.stringify(_exhaustiveCheck)}`,
    );
  }
}

export const registry = new Registry();
