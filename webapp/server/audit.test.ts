import { describe, expect, it, vi } from "vitest";
import { createActivity } from "./db";

const actor = { id: 7, name: "Ledger Keeper", email: "keeper@example.com" } as any;

describe("activity history", () => {
  it("writes an attributed append-only entry", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const tx = { insert: vi.fn(() => ({ values })) };
    await createActivity(actor, "created", "expense", "42", "Created team lunch", tx);
    expect(tx.insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 7, actorName: "Ledger Keeper", action: "created", entityId: "42" }));
    expect(tx).not.toHaveProperty("update");
    expect(tx).not.toHaveProperty("delete");
  });
});
