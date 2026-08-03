import type { Metadata } from "next";

import {
  ContentOutline,
  type ProjectSummary,
} from "@/components/content-outline";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "콘텐츠 뷰 테스트 | Chaek",
  description: "인증 없이 완성된 콘텐츠 구조의 읽기 화면을 확인합니다.",
};

const testSummary: ProjectSummary = {
  project: {
    id: "content-view-test",
    seedInput: "LLM From Scratch",
    status: "ready",
    title: "처음부터 구현하며 이해하는 LLM",
    briefJson: {
      assumptions: [
        "Python 기초 문법을 알고 있다.",
        "고등학교 수준의 수학 개념을 다시 익힐 의향이 있다.",
      ],
      audience:
        "LLM을 사용해 본 적은 있지만 내부 동작을 코드 수준에서 이해하고 싶은 개발자",
      completionArtifact:
        "작은 Transformer 언어 모델을 직접 학습하고 추론하는 실행 가능한 프로젝트",
      exclusions: ["대규모 분산 학습", "상용 모델 수준의 최적화"],
      language: "ko",
      prerequisites: ["Python", "기초 선형대수", "기본적인 머신러닝 경험"],
      promise:
        "수식과 코드를 함께 따라가며 토큰화부터 Transformer, 학습과 추론까지 하나의 흐름으로 연결합니다.",
      scope: [
        "텍스트와 토큰",
        "신경망 학습",
        "Attention",
        "Transformer",
        "생성과 평가",
      ],
      title: "처음부터 구현하며 이해하는 LLM",
    },
  },
  outline: {
    conceptCount: 18,
    exampleCount: 9,
    parts: [
      {
        id: "part-foundation",
        position: 1,
        title: "Part I. 언어를 숫자로 바꾸기",
        chapters: [
          {
            id: "chapter-language-model",
            position: 1,
            title: "언어 모델이 예측하는 것",
            editorialStatus: "planned",
            contract: {
              purpose:
                "언어 모델을 다음 토큰의 확률을 계산하는 시스템으로 정의하고 책 전체의 목표를 세웁니다.",
              readerStateBefore:
                "LLM을 대화형 제품이나 API의 관점에서만 이해한다.",
              readerStateAfter:
                "언어 모델의 입력, 출력, 학습 목표를 확률 예측 문제로 설명할 수 있다.",
              mustCover: ["다음 토큰 예측", "확률 분포", "학습과 추론"],
            },
          },
          {
            id: "chapter-tokenization",
            position: 2,
            title: "텍스트를 토큰으로 나누기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "문자열을 모델이 처리할 수 있는 정수 시퀀스로 변환하고 토크나이저의 선택이 모델에 미치는 영향을 이해합니다.",
              mustCover: ["Vocabulary", "Encoding", "BPE", "Unknown token"],
            },
          },
          {
            id: "chapter-embedding",
            position: 3,
            title: "토큰에 위치와 의미 부여하기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Embedding과 positional information을 구현해 이산적인 토큰을 학습 가능한 벡터로 바꿉니다.",
              mustCover: [
                "Token embedding",
                "Position embedding",
                "Vector space",
              ],
            },
          },
        ],
      },
      {
        id: "part-transformer",
        position: 2,
        title: "Part II. Transformer를 조립하기",
        chapters: [
          {
            id: "chapter-attention",
            position: 1,
            title: "Self-Attention을 직접 계산하기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Query, Key, Value가 문맥을 모으는 과정을 작은 행렬 예제로 계산하고 코드로 옮깁니다.",
              mustCover: [
                "Query·Key·Value",
                "Scaled dot product",
                "Causal mask",
              ],
            },
          },
          {
            id: "chapter-block",
            position: 2,
            title: "하나의 Transformer Block 만들기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Multi-head attention, feed-forward network, residual connection을 하나의 재사용 가능한 블록으로 조립합니다.",
              mustCover: [
                "Multi-head attention",
                "LayerNorm",
                "Residual",
                "MLP",
              ],
            },
          },
          {
            id: "chapter-model",
            position: 3,
            title: "작은 GPT 완성하기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Embedding, Transformer Block, language-model head를 연결해 학습 가능한 전체 모델을 완성합니다.",
              mustCover: [
                "Model composition",
                "Logits",
                "Parameter initialization",
              ],
            },
          },
        ],
      },
      {
        id: "part-training",
        position: 3,
        title: "Part III. 학습시키고 생성하기",
        chapters: [
          {
            id: "chapter-training",
            position: 1,
            title: "데이터에서 패턴 학습하기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Batch 구성부터 loss, backpropagation, optimizer step까지 학습 루프를 완성합니다.",
              mustCover: [
                "Cross entropy",
                "Backpropagation",
                "Optimizer",
                "Validation",
              ],
            },
          },
          {
            id: "chapter-generation",
            position: 2,
            title: "다음 토큰을 선택해 문장 만들기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "모델의 확률 분포에서 토큰을 반복 선택하고 temperature와 top-k가 결과에 미치는 영향을 실험합니다.",
              mustCover: ["Sampling", "Temperature", "Top-k", "Context window"],
            },
          },
          {
            id: "chapter-evaluation",
            position: 3,
            title: "결과를 읽고 다음 실험 설계하기",
            editorialStatus: "planned",
            contract: {
              purpose:
                "Loss와 생성 샘플을 함께 관찰해 모델의 한계를 진단하고 개선 실험의 우선순위를 정합니다.",
              mustCover: [
                "Perplexity",
                "Qualitative review",
                "Overfitting",
                "Experiment log",
              ],
            },
          },
        ],
      },
    ],
  },
};

export default function ContentTestPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <section
        aria-labelledby="content-test-title"
        className="grid gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-16"
      >
        <div className="lg:sticky lg:top-10 lg:self-start">
          <Badge variant="outline">Content View Test</Badge>
          <h1
            className="mt-5 text-4xl leading-[1.08] font-medium tracking-[-0.045em] text-balance sm:text-5xl"
            id="content-test-title"
          >
            {testSummary.project.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            {testSummary.project.briefJson?.promise}
          </p>
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-xs font-medium text-muted-foreground">
              검증 범위
            </p>
            <p className="mt-2 text-sm leading-6">
              인증과 생성 요청 없이 완성된 Brief, Part, Chapter, Chapter
              Contract의 읽기 화면만 확인합니다.
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <ContentOutline summary={testSummary} />
        </div>
      </section>
    </div>
  );
}
