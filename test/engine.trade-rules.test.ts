import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";
import type { ClientAction, TradeRentRule } from "@game/types";

/** Ada (0) offers Bo (1) a clause-only trade, then Bo accepts it. */
function withRules(rules: TradeRentRule[]): GameDriver {
  const game = startedGame(["Ada", "Bo"]);
  game.admin({ kind: "setOwner", pos: 6, owner: 1 }); // Bo is the landlord on space 6
  game.apply("Ada", {
    type: "proposeTrade",
    to: 1,
    offerProps: [],
    requestProps: [],
    offerCash: 0,
    requestCash: 0,
    rules,
  });
  game.apply("Bo", { type: "respondTrade", accept: true });
  return game;
}

describe("custom rent clauses — proposal", () => {
  it("accepts a clause-only trade (no props or cash)", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.apply("Ada", {
      type: "proposeTrade",
      to: 1,
      offerProps: [],
      requestProps: [],
      offerCash: 0,
      requestCash: 0,
      rules: [{ beneficiary: "from", mode: "waive", value: 0, turns: 3 }],
    });
    expect(game.state.pendingTrade?.rules).toHaveLength(1);
  });

  it("still rejects a wholly empty trade", () => {
    const game = startedGame(["Ada", "Bo"]);
    const empty: ClientAction = { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [] };
    expect(game.apply("Ada", empty).error).toBe("An empty trade isn't much of a trade.");
  });

  it("clamps clause values and turns into range", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.apply("Ada", {
      type: "proposeTrade",
      to: 1,
      offerProps: [],
      requestProps: [],
      offerCash: 0,
      requestCash: 0,
      rules: [{ beneficiary: "to", mode: "percent", value: 250, turns: 9999 }],
    });
    const rule = game.state.pendingTrade!.rules[0];
    expect(rule.value).toBe(100); // percent clamped to 100
    expect(rule.turns).toBe(50); // turns clamped to the max
  });

  it("rejects a structurally invalid clause", () => {
    const game = startedGame(["Ada", "Bo"]);
    const bad = {
      type: "proposeTrade",
      to: 1,
      offerProps: [],
      requestProps: [],
      offerCash: 0,
      requestCash: 0,
      rules: [{ beneficiary: "nobody", mode: "waive", value: 0, turns: 3 }],
    } as unknown as ClientAction;
    expect(game.apply("Ada", bad).error).toBe("That trade has an invalid rent clause.");
  });
});

describe("custom rent clauses — acceptance & effect", () => {
  it("instantiates a live agreement on acceptance", () => {
    const game = withRules([{ beneficiary: "from", mode: "waive", value: 0, turns: 3 }]);
    expect(game.state.rentAgreements).toEqual([
      { payer: 0, payee: 1, mode: "waive", value: 0, turnsLeft: 3 },
    ]);
  });

  it("waives rent the beneficiary lands into", () => {
    const game = withRules([{ beneficiary: "from", mode: "waive", value: 0, turns: 3 }]);
    game.rigRoll("Ada", 3, 3); // Ada lands on space 6, owned by Bo
    expect(game.state.pendingRent?.amount).toBe(0);
    expect(game.state.log.at(-1)).toContain("trade clause applied");
  });

  it("charges a percentage of the normal rent", () => {
    const game = withRules([{ beneficiary: "from", mode: "percent", value: 50, turns: 3 }]);
    game.rigRoll("Ada", 3, 3); // full rent on space 6 is $6
    expect(game.state.pendingRent?.amount).toBe(3);
  });

  it("caps rent at a flat amount but never charges more than owed", () => {
    const capped = withRules([{ beneficiary: "from", mode: "fixed", value: 2, turns: 3 }]);
    capped.rigRoll("Ada", 3, 3); // full rent $6 -> capped to $2
    expect(capped.state.pendingRent?.amount).toBe(2);

    const generous = withRules([{ beneficiary: "from", mode: "fixed", value: 999, turns: 3 }]);
    generous.rigRoll("Ada", 3, 3); // cap above the real rent -> still $6
    expect(generous.state.pendingRent?.amount).toBe(6);
  });

  it("only discounts the matching payer→payee direction", () => {
    // Clause benefits Bo paying Ada, but here Ada pays Bo — no discount.
    const game = withRules([{ beneficiary: "to", mode: "waive", value: 0, turns: 3 }]);
    game.rigRoll("Ada", 3, 3);
    expect(game.state.pendingRent?.amount).toBe(6);
  });
});

describe("custom rent clauses — expiry & cleanup", () => {
  it("counts down over the beneficiary's own turns and then lapses", () => {
    // Each player owns the spaces they land on, so turns end cleanly (no buy/rent).
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 3, owner: 0 }); // Ada
    game.admin({ kind: "setOwner", pos: 9, owner: 0 }); // Ada
    game.admin({ kind: "setOwner", pos: 8, owner: 1 }); // Bo
    game.apply("Ada", {
      type: "proposeTrade",
      to: 1,
      offerProps: [],
      requestProps: [],
      offerCash: 0,
      requestCash: 0,
      rules: [{ beneficiary: "from", mode: "waive", value: 0, turns: 2 }],
    });
    game.apply("Bo", { type: "respondTrade", accept: true });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(2);

    // Ada (pos 0 -> 3, her own) ends her turn -> one turn consumed.
    game.rigRoll("Ada", 1, 2);
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(1);

    // Bo (pos 0 -> 8, his own) ending his turn does not touch Ada's clause.
    game.rigRoll("Bo", 5, 3);
    game.apply("Bo", { type: "endTurn" });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(1);

    // Ada (pos 3 -> 9, her own) ends a second turn -> clause expires and is removed.
    game.rigRoll("Ada", 1, 5);
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.rentAgreements).toHaveLength(0);
    expect(game.state.log.some((line) => line.includes("expired"))).toBe(true);
  });

  it("drops agreements when a party leaves the game", () => {
    // Three players so Bo's exit doesn't end the game outright.
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.apply("Ada", {
      type: "proposeTrade",
      to: 1,
      offerProps: [],
      requestProps: [],
      offerCash: 0,
      requestCash: 0,
      rules: [{ beneficiary: "from", mode: "waive", value: 0, turns: 3 }],
    });
    game.apply("Bo", { type: "respondTrade", accept: true });
    expect(game.state.rentAgreements).toHaveLength(1);

    game.apply("Bo", { type: "surrender" }); // Bo (the landlord) bows out
    expect(game.state.rentAgreements).toHaveLength(0);
  });
});
