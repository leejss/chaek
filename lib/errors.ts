/**
 * Configuration error (env, secrets, required runtime settings).
 *
 * This is intentionally NOT an HTTP error. Map it to HTTP at the edge (routes).
 */
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

export class ConfigError extends Error {
  public readonly missingEnv?: string;

  constructor(params?: { missingEnv?: string }) {
    // IMPORTANT: keep message generic so it never leaks sensitive details.
    super("Server misconfigured");
    this.name = "ConfigError";
    this.missingEnv = params?.missingEnv;
  }
}
