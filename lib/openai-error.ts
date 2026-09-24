import type { APIError } from "openai";

const quotaMessages = {
  credit_balance_exhausted:
    "The playlist assistant’s OpenAI API account has no remaining credits. The site owner needs to check the billing account linked to this API key.",
  organization_spend_limit_exceeded:
    "The playlist assistant has reached its OpenAI organization spending limit. The site owner needs to review that limit before trying again.",
  project_spend_limit_exceeded:
    "The playlist assistant has reached its OpenAI project spending limit. The site owner needs to review the project linked to this API key before trying again.",
  organization_usage_limit_exceeded:
    "The playlist assistant has reached its OpenAI organization usage limit. The site owner needs to review that account’s approved API limits.",
  insufficient_quota:
    "OpenAI blocked the playlist assistant because of an API billing or quota limit. The site owner needs to check the billing and limits for the project linked to this API key.",
} as const;

const diagnosticCodes = new Set([
  ...Object.keys(quotaMessages),
  "rate_limit_exceeded",
  "slow_down",
  "server_is_overloaded",
  "invalid_api_key",
  "model_not_found",
]);

type ErrorCategory =
  "billing" | "rate_limit" | "upstream_limit" | "unavailable";

export interface OpenAIErrorDetails {
  status: number;
  message: string;
  code: string;
  category: ErrorCategory;
  providerCode: string;
  retryAfter?: number;
}

function retryDelay(headers: Headers | undefined): number | undefined {
  const value = headers?.get("retry-after")?.trim();
  if (!value) return undefined;
  // Retry-After permits seconds or an HTTP date. Ignore malformed hints.
  const seconds = /^\d+(\.\d+)?$/.test(value)
    ? Number(value)
    : /^[A-Za-z]{3},/.test(value)
      ? (Date.parse(value) - Date.now()) / 1000
      : NaN;
  const delay = Math.max(1, Math.ceil(seconds));
  return Number.isSafeInteger(delay) ? delay : undefined;
}

export function describeOpenAIError(
  error: APIError,
): OpenAIErrorDetails {
  const providerCode = diagnosticCodes.has(error.code ?? "")
    ? error.code!
    : error.type === "insufficient_quota"
      ? "insufficient_quota"
      : "unknown";
  const base = { providerCode };
  if (error.status === 429) {
    // Billing errors are not fixed by retrying, even if a delay header is present.
    if (Object.hasOwn(quotaMessages, providerCode)) {
      return {
        ...base,
        status: 503,
        code: "AI_BILLING_LIMIT",
        category: "billing",
        message: quotaMessages[providerCode as keyof typeof quotaMessages],
      };
    }
    if (
      providerCode === "rate_limit_exceeded" ||
      providerCode === "slow_down" ||
      error.type === "rate_limit_error"
    ) {
      const retryAfter = retryDelay(error.headers);
      return {
        ...base,
        status: 429,
        code: "AI_RATE_LIMIT",
        category: "rate_limit",
        retryAfter,
        message: retryAfter
          ? `The playlist assistant is receiving requests too quickly. Try again in ${retryAfter} seconds.`
          : "The playlist assistant is receiving requests too quickly. Please wait a moment before trying again.",
      };
    }
    return {
      ...base,
      status: 429,
      code: "AI_UPSTREAM_LIMIT",
      category: "upstream_limit",
      message:
        "OpenAI rejected the playlist assistant request because of an unspecified API limit. The site owner needs to check the API project’s limits and the Vercel logs.",
    };
  }
  return {
    ...base,
    status: 502,
    code: "AI_UNAVAILABLE",
    category: "unavailable",
    message: "The playlist assistant is unavailable. Please try again shortly.",
  };
}
