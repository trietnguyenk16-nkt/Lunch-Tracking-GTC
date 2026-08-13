import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("protected shared ledger routes", () => {
  it("rejects anonymous snapshot access", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.team.snapshot()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
