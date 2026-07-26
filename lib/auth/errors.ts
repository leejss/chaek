export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class OAuthAccountConflictError extends Error {
  constructor() {
    super("The verified email is already associated with another account.");
    this.name = "OAuthAccountConflictError";
  }
}

export class OAuthFlowError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`OAuth flow failed: ${code}`);
    this.name = "OAuthFlowError";
    this.code = code;
  }
}
