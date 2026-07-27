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

export class AiJobNotFoundError extends Error {
  constructor() {
    super("The AI job does not exist.");
    this.name = "AiJobNotFoundError";
  }
}
