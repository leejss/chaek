import * as z from "zod";

const UNSUPPORTED_GEMINI_SCHEMA_KEYS = new Set([
  "$schema",
  "maxLength",
  "minLength",
  "pattern",
]);

const COMPLEX_SCHEMA_BOUND_KEYS = new Set([
  "maximum",
  "maxItems",
  "minimum",
  "minItems",
]);

function stripUnsupportedGeminiSchemaKeywords(
  value: unknown,
  omittedKeys: ReadonlySet<string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((child) =>
      stripUnsupportedGeminiSchemaKeywords(child, omittedKeys),
    );
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !omittedKeys.has(key))
      .map(([key, child]) => [
        key,
        stripUnsupportedGeminiSchemaKeywords(child, omittedKeys),
      ]),
  );
}

export function toGeminiJsonSchema(
  schema: z.ZodType,
  options?: { omitBounds?: boolean },
) {
  const jsonSchema = z.toJSONSchema(schema, {
    cycles: "throw",
    reused: "inline",
    target: "draft-7",
    unrepresentable: "throw",
  });

  const omittedKeys = options?.omitBounds
    ? new Set([...UNSUPPORTED_GEMINI_SCHEMA_KEYS, ...COMPLEX_SCHEMA_BOUND_KEYS])
    : UNSUPPORTED_GEMINI_SCHEMA_KEYS;

  return stripUnsupportedGeminiSchemaKeywords(
    jsonSchema,
    omittedKeys,
  ) as Record<string, unknown>;
}
