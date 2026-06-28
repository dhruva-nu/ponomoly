import { describe, expect, it } from "vitest";
import { GameDriver, startedGame } from "./support/driver";
import { BOARD } from "@game/board";
import type { ClientAction, RentRuleScope, TradeRentRule } from "@game/types";

/** Build a clause, defaulting the scope to board-wide. */
function rule(over: Partial<TradeRentRule> = {}): TradeRentRule {
  return { beneficiary: "from", mode: "waive", value: 0, turns: 3, scope: { kind: "all" }, ...over };
}

/** Ada (0) offers Bo (1) a clause-only trade, then Bo accepts it. Bo owns space
 *  6 and space 1, which sit in different color groups. */
function withRules(rules: TradeRentRule[]): GameDriver {
  const game = startedGame(["Ada", "Bo"]);
  game.admin({ kind: "setOwner", pos: 6, owner: 1 });
  game.admin({ kind: "setOwner", pos: 1, owner: 1 });
  game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules });
  game.apply("Bo", { type: "respondTrade", accept: true });
  return game;
}

describe("custom rent clauses — proposal", () => {
  it("accepts a clause-only trade (no props or cash)", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule()] });
    expect(game.state.pendingTrade?.rules).toHaveLength(1);
  });

  it("still rejects a wholly empty trade", () => {
    const game = startedGame(["Ada", "Bo"]);
    const empty: ClientAction = { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [] };
    expect(game.apply("Ada", empty).error).toBe("An empty trade isn't much of a trade.");
  });

  it("clamps clause values and turns into range", () => {
    const game = startedGame(["Ada", "Bo"]);
    game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule({ beneficiary: "to", mode: "percent", value: 250, turns: 9999 })] });
    const stored = game.state.pendingTrade!.rules[0];
    expect(stored.value).toBe(100); // percent clamped to 100
    expect(stored.turns).toBe(50); // turns clamped to the max
  });

  it("rejects a structurally invalid clause", () => {
    const game = startedGame(["Ada", "Bo"]);
    const bad = { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [{ beneficiary: "nobody", mode: "waive", value: 0, turns: 3, scope: { kind: "all" } }] } as unknown as ClientAction;
    expect(game.apply("Ada", bad).error).toBe("That trade has an invalid rent clause.");
  });

  it("rejects an invalid scope (unowned color / bad site)", () => {
    const game = startedGame(["Ada", "Bo"]);
    const badColor = { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule({ scope: { kind: "color", color: "#notacolor" } })] } as ClientAction;
    expect(game.apply("Ada", badColor).error).toBe("That trade has an invalid rent clause.");
    const badSite = { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule({ scope: { kind: "site", space: 4 } })] } as ClientAction; // 4 is a tax space (not ownable)
    expect(game.apply("Ada", badSite).error).toBe("That trade has an invalid rent clause.");
  });
});

describe("custom rent clauses — acceptance & effect", () => {
  it("instantiates a live agreement on acceptance", () => {
    const game = withRules([rule({ mode: "waive", turns: 3 })]);
    expect(game.state.rentAgreements).toEqual([
      { payer: 0, payee: 1, mode: "waive", value: 0, scope: { kind: "all" }, turnsLeft: 3 },
    ]);
  });

  it("waives rent the beneficiary lands into", () => {
    const game = withRules([rule({ mode: "waive" })]);
    game.rigRoll("Ada", 3, 3); // Ada lands on space 6, owned by Bo
    expect(game.state.pendingRent?.amount).toBe(0);
    expect(game.state.log.at(-1)).toContain("trade clause applied");
  });

  it("charges a percentage of the normal rent", () => {
    const game = withRules([rule({ mode: "percent", value: 50 })]);
    game.rigRoll("Ada", 3, 3); // full rent on space 6 is $6
    expect(game.state.pendingRent?.amount).toBe(3);
  });

  it("caps rent at a flat amount but never charges more than owed", () => {
    const capped = withRules([rule({ mode: "fixed", value: 2 })]);
    capped.rigRoll("Ada", 3, 3); // full rent $6 -> capped to $2
    expect(capped.state.pendingRent?.amount).toBe(2);

    const generous = withRules([rule({ mode: "fixed", value: 999 })]);
    generous.rigRoll("Ada", 3, 3); // cap above the real rent -> still $6
    expect(generous.state.pendingRent?.amount).toBe(6);
  });

  it("only discounts the matching payer→payee direction", () => {
    // Clause benefits Bo paying Ada, but here Ada pays Bo — no discount.
    const game = withRules([rule({ beneficiary: "to", mode: "waive" })]);
    game.rigRoll("Ada", 3, 3);
    expect(game.state.pendingRent?.amount).toBe(6);
  });
});

describe("custom rent clauses — scoping", () => {
  const scoped = (scope: RentRuleScope) => withRules([rule({ mode: "waive", scope })]);

  it("a site-scoped clause covers only that property", () => {
    const game = scoped({ kind: "site", space: 6 });
    game.rigRoll("Ada", 3, 3); // lands on 6 -> covered -> waived
    expect(game.state.pendingRent?.amount).toBe(0);

    const other = scoped({ kind: "site", space: 8 });
    other.rigRoll("Ada", 3, 3); // lands on 6, clause is for 8 -> full rent
    expect(other.state.pendingRent?.amount).toBe(6);
  });

  it("a color-scoped clause covers the whole group but nothing else", () => {
    // The clause targets space 6's color, so landing on 6 is waived.
    const game = scoped({ kind: "color", color: BOARD[6].c! });
    game.rigRoll("Ada", 3, 3);
    expect(game.state.pendingRent?.amount).toBe(0);

    // A clause for space 1's (different) color leaves space 6 alone.
    expect(BOARD[1].c).not.toBe(BOARD[6].c);
    const off = scoped({ kind: "color", color: BOARD[1].c! });
    off.rigRoll("Ada", 3, 3);
    expect(off.state.pendingRent?.amount).toBe(6);
  });
});

describe("custom rent clauses — consumption & cleanup", () => {
  it("is spent by landing on a covered space, not by turns elapsing", () => {
    // Bo (1) owns spaces 6 and 9; Ada (0) owns 3 for a clean idle turn. A 2-use
    // board-wide waiver lets Ada skip rent on Bo's holdings twice. Every roll is
    // a non-double so each turn ends without a bonus roll.
    const game = startedGame(["Ada", "Bo"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.admin({ kind: "setOwner", pos: 9, owner: 1 });
    game.admin({ kind: "setOwner", pos: 3, owner: 0 });
    game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule({ mode: "waive", turns: 2 })] });
    game.apply("Bo", { type: "respondTrade", accept: true });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(2);

    // Ada takes a whole turn WITHOUT landing on a covered space -> clause intact.
    game.rigRoll("Ada", 2, 1); // 0 -> 3 (her own)
    game.apply("Ada", { type: "endTurn" });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(2);

    // Bo's turn never touches Ada's clause either.
    game.rigRoll("Bo", 2, 4); // 0 -> 6 (his own)
    game.apply("Bo", { type: "endTurn" });
    expect(game.state.rentAgreements[0].turnsLeft).toBe(2);

    // Ada lands on Bo's space 6 -> rent waived AND one use spent.
    game.rigRoll("Ada", 1, 2); // 3 -> 6 (covered)
    expect(game.state.pendingRent?.amount).toBe(0);
    expect(game.state.rentAgreements[0].turnsLeft).toBe(1);
    game.apply("Ada", { type: "payRent" });
    game.apply("Ada", { type: "endTurn" });

    game.rigRoll("Bo", 1, 2); // 6 -> 9 (his own)
    game.apply("Bo", { type: "endTurn" });

    // Ada lands on a covered space a second time -> last use spent, clause retired.
    game.rigRoll("Ada", 1, 2); // 6 -> 9 (covered)
    expect(game.state.pendingRent?.amount).toBe(0);
    expect(game.state.rentAgreements).toHaveLength(0);
    expect(game.state.log.some((line) => line.includes("used up"))).toBe(true);
  });

  it("drops agreements when a party leaves the game", () => {
    // Three players so Bo's exit doesn't end the game outright.
    const game = startedGame(["Ada", "Bo", "Cy"]);
    game.admin({ kind: "setOwner", pos: 6, owner: 1 });
    game.apply("Ada", { type: "proposeTrade", to: 1, offerProps: [], requestProps: [], offerCash: 0, requestCash: 0, rules: [rule({ mode: "waive" })] });
    game.apply("Bo", { type: "respondTrade", accept: true });
    expect(game.state.rentAgreements).toHaveLength(1);

    game.apply("Bo", { type: "surrender" }); // Bo (the landlord) bows out
    expect(game.state.rentAgreements).toHaveLength(0);
  });
});
