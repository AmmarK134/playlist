import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { describeOpenAIError } from "../lib/openai-error";
import { apiErrorResponse } from "../lib/server-api";
import { ApiError } from "../lib/api-error";

const providerError = (
  code: string | null,
  type = "rate_limit_error",
  retryAfter?: string,
) =>
  new OpenAI.APIError(
    429,
    { code, type, message: "private-provider-message" },
    undefined,
    new Headers(retryAfter === undefined ? {} : { "retry-after": retryAfter }),
  );

test("OpenAI credit and spend limits require billing action rather than retries", () => {
  for (const code of [
    "credit_balance_exhausted",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "organization_usage_limit_exceeded",
    "insufficient_quota",
  ]) {
    const result = describeOpenAIError(
      providerError(code, "insufficient_quota", "30"),
    );
    assert.equal(result.status, 503);
    assert.equal(result.code, "AI_BILLING_LIMIT");
    assert.equal(result.retryAfter, undefined);
    assert.equal(result.message.includes("private-provider-message"), false);
  }
  const result = describeOpenAIError(
    providerError("project_spend_limit_exceeded", "insufficient_quota"),
  );
  assert.match(result.message, /project spending limit/);
  assert.doesNotMatch(result.message, /no remaining credits/);
});

test("explicit throttling codes take priority over a generic quota error type", () => {
  for (const code of ["rate_limit_exceeded", "slow_down"]) {
    const result = describeOpenAIError(
      providerError(code, "insufficient_quota", "7.2"),
    );
    assert.equal(result.status, 429);
    assert.equal(result.category, "rate_limit");
    assert.equal(result.retryAfter, 8);
    assert.match(result.message, /8 seconds/);
  }
});

test("retry hints accept HTTP dates and reject invalid or negative values", (context) => {
  context.mock.method(Date, "now", () => Date.parse("2026-09-23T12:00:00Z"));
  const future = describeOpenAIError(
    providerError(
      "slow_down",
      "rate_limit_error",
      "Wed, 23 Sep 2026 12:00:45 GMT",
    ),
  );
  assert.equal(future.retryAfter, 45);
  for (const value of ["-10", "junk", "Infinity", "", "9007199254740992"]) {
    assert.equal(
      describeOpenAIError(providerError("slow_down", "rate_limit_error", value))
        .retryAfter,
      undefined,
    );
  }
});

test("unrecognized 429s stay ambiguous while legacy insufficient_quota is recognized", () => {
  const unknown = describeOpenAIError(
    providerError("undocumented_limit", "unknown", "60"),
  );
  assert.equal(unknown.code, "AI_UPSTREAM_LIMIT");
  assert.equal(unknown.providerCode, "unknown");
  assert.equal(unknown.retryAfter, undefined);
  assert.doesNotMatch(unknown.message, /no remaining credits|too quickly/);
  const legacy = describeOpenAIError(providerError(null, "insufficient_quota"));
  assert.equal(legacy.code, "AI_BILLING_LIMIT");
});

test("API responses and diagnostics expose classifications without raw provider data", async (context) => {
  const log = context.mock.method(console, "warn", () => {});
  const error = new OpenAI.APIError(
    429,
    {
      code: "project_spend_limit_exceeded",
      type: "insufficient_quota",
      message: "sensitive-credential-and-user-prompt",
      secret: "sensitive-credential-and-user-prompt",
    },
    undefined,
    new Headers({
      authorization: "sensitive-credential-and-user-prompt",
      "retry-after": "30",
    }),
  );
  const response = apiErrorResponse(error);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), null);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.code, "AI_BILLING_LIMIT");
  assert.match(body.error, /project spending limit/);
  assert.doesNotMatch(JSON.stringify(body), /sensitive-/);
  assert.deepEqual(log.mock.calls[0].arguments, [
    "PlaylistHelper OpenAI request failed",
    {
      status: 429,
      code: "project_spend_limit_exceeded",
      category: "billing",
    },
  ]);
  const throttled = apiErrorResponse(
    providerError("rate_limit_exceeded", "rate_limit_error", "22"),
  );
  assert.equal(throttled.headers.get("Retry-After"), "22");
});

test("app and Spotify rate limits retain their own messages and retry headers", async () => {
  const response = apiErrorResponse(new ApiError("Spotify is busy", 429, 12));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "12");
  assert.deepEqual(await response.json(), { error: "Spotify is busy" });
});
