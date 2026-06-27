import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";

/** Ada (0) lands on space 6 owned by Bo (1), owing $6 rent. */
function rentOwed(): GameDriver {
  const game = startedGame(["Ada", "Bo"]);
  game.admin({ kind: "setOwner", pos: 6, owner: 1 });
  game.rigRoll("Ada", 3, 3);
  return game;
}

describe("payRent", () => {
  it("guards phase, turn, and an absent debt", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "payRent" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "payRent" }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "payRent" }).error).toBe("No rent due.");
  });

  it("transfers rent from tenant to owner", () => {
    const game = rentOwed();
    game.apply("Ada", { type: "payRent" });
    expect(game.player(0).cash).toBe(1494);
    expect(game.player(1).cash).toBe(1506);
    expect(game.state.pendingRent).toBeNull();
  });

  it("tolerates an owner index that no longer exists", () => {
    const game = rentOwed();
    const broken = structuredClone(game.state);
    broken.pendingRent!.to = 5; // dangling landlord
    game.admin({ kind: "replaceState", state: broken });
    game.apply("Ada", { type: "payRent" });
    expect(game.player(0).cash).toBe(1494);
    expect(game.state.log.at(-1)).toContain("owner");
  });
});

describe("requestNegotiate", () => {
  it("guards phase, turn, and an absent debt", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "requestNegotiate" }).error).toBe("Game not in progress.");
    const game = startedGame(["Ada", "Bo"]);
    expect(game.apply("Bo", { type: "requestNegotiate" }).error).toBe("Not your turn.");
    expect(game.apply("Ada", { type: "requestNegotiate" }).error).toBe("No rent to negotiate.");
  });

  it("flags the debt as under negotiation", () => {
    const game = rentOwed();
    game.apply("Ada", { type: "requestNegotiate" });
    expect(game.state.pendingRent!.negotiating).toBe(true);
  });
});

describe("negotiateRent", () => {
  it("guards phase, an absent debt, and non-owners", () => {
    const lobby = new GameDriver();
    expect(lobby.apply("x", { type: "negotiateRent", amount: 0 }).error).toBe("Game not in progress.");
    const noDebt = startedGame(["Ada", "Bo"]);
    expect(noDebt.apply("Bo", { type: "negotiateRent", amount: 0 }).error).toBe("No rent to negotiate.");
    const game = rentOwed();
    expect(game.apply("Ada", { type: "negotiateRent", amount: 0 }).error).toBe("Only the owner can adjust this rent.");
  });

  it("lets the owner waive, cut, or hold the rent (clamped to the original)", () => {
    const waived = rentOwed();
    waived.apply("Bo", { type: "negotiateRent", amount: -50 });
    expect(waived.state.pendingRent!.amount).toBe(0);
    expect(waived.state.log.at(-1)).toContain("waived");

    const cut = rentOwed();
    cut.apply("Bo", { type: "negotiateRent", amount: 3 });
    expect(cut.state.pendingRent!.amount).toBe(3);
    expect(cut.state.log.at(-1)).toContain("cut");

    const held = rentOwed();
    held.apply("Bo", { type: "negotiateRent", amount: 999 });
    expect(held.state.pendingRent!.amount).toBe(6);
    expect(held.state.log.at(-1)).toContain("held");
  });

  it("names a dangling owner/tenant gracefully", () => {
    const noOwner = rentOwed();
    const a = structuredClone(noOwner.state);
    a.pendingRent!.to = 5; // landlord seat no longer exists
    noOwner.admin({ kind: "replaceState", state: a });
    noOwner.apply("Ada", { type: "requestNegotiate" });
    expect(noOwner.state.log.at(-1)).toContain("the owner");

    const noTenant = rentOwed();
    const b = structuredClone(noTenant.state);
    b.pendingRent!.payer = 5; // tenant seat no longer exists
    noTenant.admin({ kind: "replaceState", state: b });
    noTenant.apply("Bo", { type: "negotiateRent", amount: 3 });
    expect(noTenant.state.log.at(-1)).toContain("the tenant");
  });
});
