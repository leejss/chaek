export class ContentProjectNotFoundError extends Error {
  constructor() {
    super("The content project does not exist.");
    this.name = "ContentProjectNotFoundError";
  }
}

export class ContentBuildNotFoundError extends Error {
  constructor() {
    super("The content build does not exist.");
    this.name = "ContentBuildNotFoundError";
  }
}

export class ContentChapterNotFoundError extends Error {
  constructor() {
    super("The content Chapter does not exist.");
    this.name = "ContentChapterNotFoundError";
  }
}

export class InvalidChapterContextError extends Error {
  constructor() {
    super("The Chapter does not have a complete generation context.");
    this.name = "InvalidChapterContextError";
  }
}

export class ContentBuildConflictError extends Error {
  constructor() {
    super("The idempotency key belongs to a different content build.");
    this.name = "ContentBuildConflictError";
  }
}

export class AiJobNotFoundError extends Error {
  constructor() {
    super("The AI job does not exist.");
    this.name = "AiJobNotFoundError";
  }
}
