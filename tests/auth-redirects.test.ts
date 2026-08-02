import assert from "node:assert/strict";
import test from "node:test";

import {
  createSignInPath,
  DEFAULT_AUTH_RETURN_TO,
  getAuthErrorMessage,
  sanitizeAuthReturnToValue,
  sanitizeReturnToValue,
} from "../lib/auth/redirects";

const baseUrl = new URL("https://chaek.example");

test("an internal return target keeps its path, query, and hash", () => {
  assert.equal(
    sanitizeReturnToValue(
      "/content?projectId=project-1#chapter",
      baseUrl,
    ),
    "/content?projectId=project-1#chapter",
  );
});

test("external and parser-confusing return targets use the fallback", () => {
  const inputs = [
    "https://attacker.example",
    "//attacker.example/content",
    "/\\attacker.example/content",
    "content",
  ];

  for (const input of inputs) {
    assert.equal(sanitizeReturnToValue(input, baseUrl), "/", input);
  }
});

test("authentication endpoints cannot become post-login destinations", () => {
  const inputs = [
    "/sign-in",
    "/sign-in/",
    "/sign-in?returnTo=%2Fsign-in",
    "/api/auth",
    "/api/auth/google",
    "/api/auth/logout",
  ];

  for (const input of inputs) {
    assert.equal(
      sanitizeAuthReturnToValue(input, baseUrl),
      DEFAULT_AUTH_RETURN_TO,
      input,
    );
  }
});

test("the sign-in path preserves a recoverable destination and known error", () => {
  assert.equal(
    createSignInPath({
      error: "session_expired",
      returnTo: "/content?projectId=project-1",
    }),
    "/sign-in?returnTo=%2Fcontent%3FprojectId%3Dproject-1&error=session_expired",
  );
});

test("only allowlisted authentication errors have user-facing messages", () => {
  assert.equal(
    getAuthErrorMessage("invalid_state"),
    "로그인 요청이 만료되었거나 유효하지 않습니다.",
  );
  assert.equal(getAuthErrorMessage("provider_stack_trace"), null);
  assert.equal(getAuthErrorMessage(undefined), null);
});
