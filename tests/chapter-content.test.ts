import assert from "node:assert/strict";
import test from "node:test";

import {
  type ChapterContentResult,
  chapterContentJsonSchema,
  chapterContentResultSchema,
  chapterDraftingJobInputSchema,
} from "../lib/content/contracts";

function createValidChapter(): ChapterContentResult {
  return {
    title: "언어 모델이 예측하는 것",
    introduction: [
      "언어 모델을 이해하는 가장 작은 출발점은 다음 토큰 예측이다.",
    ],
    sections: [
      {
        heading: "문장을 토큰의 흐름으로 보기",
        paragraphs: [
          "모델은 문자열 자체가 아니라 토큰으로 변환된 정수 시퀀스를 입력으로 받는다.",
        ],
        codeExamples: [],
      },
      {
        heading: "다음 토큰의 확률 분포",
        paragraphs: [
          "각 위치에서 모델은 Vocabulary 전체에 대한 확률 분포를 계산한다.",
        ],
        codeExamples: [
          {
            language: "python",
            code: "probabilities = logits.softmax(dim=-1)",
            explanation:
              "Softmax는 각 토큰의 Logit을 합이 1인 확률 분포로 바꾼다.",
          },
        ],
      },
      {
        heading: "학습과 추론 연결하기",
        paragraphs: [
          "학습은 정답 토큰의 확률을 높이고, 추론은 분포에서 다음 토큰을 선택한다.",
        ],
        codeExamples: [],
      },
    ],
    conclusion: [
      "다음 토큰 예측이라는 하나의 목표가 학습과 문장 생성을 연결한다.",
    ],
    keyTakeaways: [
      "언어 모델의 기본 출력은 다음 토큰의 확률 분포다.",
      "학습은 정답 토큰의 확률을 높이는 과정이다.",
      "추론은 계산된 분포에서 토큰을 반복 선택하는 과정이다.",
    ],
  };
}

test("a structured Chapter fixture satisfies the runtime contract", () => {
  assert.equal(
    chapterContentResultSchema.safeParse(createValidChapter()).success,
    true,
  );
});

test("the Chapter contract rejects unexpected model fields", () => {
  const result = chapterContentResultSchema.safeParse({
    ...createValidChapter(),
    citations: ["https://example.com"],
  });

  assert.equal(result.success, false);
});

test("the provider Chapter schema omits complex bounds", () => {
  const serializedProviderSchema = JSON.stringify(chapterContentJsonSchema);

  assert.equal(serializedProviderSchema.includes('"minimum"'), false);
  assert.equal(serializedProviderSchema.includes('"maximum"'), false);
  assert.equal(serializedProviderSchema.includes('"minItems"'), false);
  assert.equal(serializedProviderSchema.includes('"maxItems"'), false);

  const invalidRuntimeResult = createValidChapter();
  invalidRuntimeResult.sections = [];

  assert.equal(
    chapterContentResultSchema.safeParse(invalidRuntimeResult).success,
    false,
  );
});

test("a drafting Job requires graph, neighbor, and Concept context", () => {
  const result = chapterDraftingJobInputSchema.safeParse({
    promptVersion: 1,
    payloadVersion: 1,
    baseGraphVersion: 1,
    seedInput: "LLM From Scratch",
    brief: {
      title: "처음부터 구현하는 LLM",
      language: "ko",
      audience: "LLM 내부 구조를 이해하려는 개발자",
      prerequisites: ["Python"],
      promise: "작은 언어 모델을 구현한다.",
      scope: ["토큰화", "Transformer"],
      exclusions: ["분산 학습"],
      completionArtifact: "실행 가능한 작은 언어 모델",
      assumptions: [],
    },
    part: {
      id: "part-1",
      title: "기초",
      purpose: "언어 모델의 입력과 출력을 정의한다.",
    },
    chapter: {
      id: "chapter-1",
      title: "언어 모델이 예측하는 것",
      contract: {
        purpose: "다음 토큰 예측을 이해한다.",
        readerStateBefore: "LLM을 대화형 제품으로만 이해한다.",
        readerStateAfter: "언어 모델의 출력을 확률 분포로 설명한다.",
        mustCover: ["다음 토큰 예측"],
        mustNotCover: ["분산 학습"],
      },
    },
    neighboringChapters: {
      previous: null,
      next: {
        title: "텍스트를 토큰으로 나누기",
        purpose: "토큰화 과정을 구현한다.",
      },
    },
    concepts: [
      {
        name: "Token",
        canonicalDefinition: "모델이 처리하는 이산 단위",
        relationship: "introduces",
      },
    ],
  });

  assert.equal(result.success, true);
});
