export class HttpError extends Error {
  public readonly status: number;
  public readonly publicMessage: string;

  constructor(status: number, publicMessage: string) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, "Server misconfigured");
  }
  return value;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}


