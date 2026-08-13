import { describe, expect, it } from "vitest";
import { getOAuthRedirectUri } from "./const";

describe("OAuth redirect origin", () => {
  it("uses the configured HTTPS production origin", () => {
    const origin = String(import.meta.env.VITE_APP_ORIGIN ?? "");
    expect(new URL(origin).protocol).toBe("https:");
    expect(getOAuthRedirectUri("https://preview.invalid", origin)).toBe(
      `${origin}/api/oauth/callback`,
    );
  });
});
