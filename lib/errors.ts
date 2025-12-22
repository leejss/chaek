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
