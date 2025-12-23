import { PromptRegistry, PromptSpec } from "./types";
import { generateText, Output, streamText } from "ai";

class Registry implements PromptRegistry {
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
    return this.specs.get(key);
  }

  async runSpec<I, O>(
    id: string,
    version: string,
    input: I,
    model: any,
  ): Promise<any> {
    const spec = this.getSpec<I, O>(id, version);
    if (!spec) {
      throw new Error(`Spec ${id}@${version} not found`);
    }

    const messages = spec.buildMessages(input) as any; // Cast to satisfy AI SDK if strictly typed

    if (spec.kind === "object") {
      if (!spec.schema) {
        throw new Error("Schema is required for object generation");
      }

      const result = await generateText({
        model: model || spec.defaultModel,
        messages: messages,
        output: Output.object({ schema: spec.schema }),
      } as any);

      return result.output;
    } else if (spec.kind === "text") {
      const result = await streamText({
        model: model || spec.defaultModel,
        messages: messages,
      } as any);
      return result.textStream;
    }

    throw new Error(`Unsupported spec kind: ${spec.kind}`);
  }
}

export const registry = new Registry();
