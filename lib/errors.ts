export class HttpError extends Error {
  public readonly status: number;
  public readonly publicMessage: string;

  constructor(status: number, publicMessage: string) {
    super(publicMessage);
    this.name = "HttpError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super("Invalid JSON format");
    this.name = "InvalidJsonError";
  }
}

export class ValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}
