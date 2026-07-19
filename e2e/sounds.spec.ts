import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * End-to-end check for the in-game sound effects (feat/add-sound).
 *
 * A browser page joins the room as a *spectator* — it renders the real client
 * and runs useGameSounds, so every sound is triggered by genuine state
 * broadcasts. Two players are driven deterministically over raw WebSockets
 * (the same protocol the app speaks) to produce each event: a dice roll, a pawn
 * move, a property purchase, a completed trade, passing GO, and being sent to
 * Jail. We assert the matching audio file's play() was invoked on the page.
 *
 * Prereqs: `next dev` on :3000 and `wrangler dev` on :8787 already running.
 */

const WORKER = "ws://127.0.0.1:8787";
const ADMIN_PASSWORD = "adminisgod";
const ROOM = "SNDTEST" + Math.floor(Date.now() % 100000);

/** A raw player/admin socket that mirrors what the browser client sends. */
class Actor {
  ws: WebSocket;
  id: string;
  state: any = null;
  constructor(room: string) {
    this.id = randomUUID();
    this.ws = new WebSocket(`${WORKER}/parties/main/${room}?id=${this.id}`);
    this.ws.addEventListener("message", (e: MessageEvent) => {
      const msg = JSON.parse(String(e.data));
      if (msg.type === "state") this.state = msg.state;
    });
  }
  send(action: unknown) { this.ws.send(JSON.stringify(action)); }
  admin(cmd: unknown) { this.send({ type: "admin", password: ADMIN_PASSWORD, cmd }); }
  async open() { await waitFor(() => this.ws.readyState === WebSocket.OPEN); }
  close() { this.ws.close(); }
}

async function waitFor(pred: () => boolean | Promise<boolean>, timeout = 15_000, label = "condition"): Promise<void> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (await pred()) return;
    if (Date.now() - start > timeout) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Sounds recorded on the page: their src basenames, in play() order. */
async function recordedSounds(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__sounds ?? []);
}

test("all six game events play their sound", async ({ page }) => {
  // Spy on media playback before any app script runs, on every navigation.
  await page.addInitScript(() => {
    (window as any).__sounds = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const src = this.currentSrc || this.src || "";
      const base = src.split("/").pop() || src;
      (window as any).__sounds.push(base);
      return orig.apply(this, arguments as any);
    };
  });

  // Join as a nameless spectator (no pt-name => the client never auto-joins).
  await page.goto(`/room/${ROOM}`);

  // Drive two real players over the wire.
  const alice = new Actor(ROOM);
  const bob = new Actor(ROOM);
  await alice.open();
  await bob.open();

  alice.send({ type: "join", name: "Alice" });
  bob.send({ type: "join", name: "Bob" });
  await waitFor(() => (alice.state?.players?.length ?? 0) === 2, 15_000, "both seated");

  // Host (first joiner) starts; both roll for turn order; wait for play to begin.
  alice.send({ type: "start" });
  await waitFor(() => alice.state?.phase === "rolloff", 15_000, "rolloff");
  // Roll for order until it resolves. Dice are random here, so a tie starts a
  // fresh round; re-rolling any contender who hasn't rolled this round (the
  // engine rejects a duplicate roll harmlessly) drives it to a winner. The
  // settle then runs on a server alarm, which we also nudge with tickRolloff.
  await waitFor(() => {
    const r = alice.state?.rolloff;
    if (r && r.winner === undefined) {
      if (r.rolls?.[0] === undefined) alice.send({ type: "rollForOrder" });
      if (r.rolls?.[1] === undefined) bob.send({ type: "rollForOrder" });
    }
    alice.send({ type: "tickRolloff" });
    return alice.state?.phase === "playing";
  }, 20_000, "playing");

  const actors = [alice, bob];
  const cur = () => actors.find((a) => a.state.players[a.state.turn].id === a.id)!;
  const other = () => actors.find((a) => a.state.players[a.state.turn].id !== a.id)!;

  // --- Dice roll + pawn move: force a 3 so the mover lands on Baltic Ave (buyable).
  cur().admin({ kind: "forceDice", d1: 1, d2: 2 });
  await waitFor(() => cur().state?.riggedDice != null, 10_000, "rigged dice set");
  const mover = cur();
  mover.send({ type: "roll" });
  await waitFor(() => mover.state?.dice?.rolled === true, 10_000, "rolled");
  await waitFor(() => mover.state?.players[mover.state.turn].position === 3, 10_000, "landed on Baltic");

  // Dice sound fires immediately; step sounds are scheduled one per tile hopped,
  // synced to the walk animation. The mover travelled 3 tiles (0 -> 3), so expect
  // three pawn-move plays.
  await waitFor(async () => (await recordedSounds(page)).includes("dice-roll.mp3"), 10_000, "dice sound");
  await waitFor(async () => (await recordedSounds(page)).filter((s) => s === "pawn-move.mp3").length >= 3, 10_000, "three step sounds");

  // --- Property purchase.
  const buyer = cur();
  buyer.send({ type: "buy" });
  await waitFor(() => buyer.state?.owners?.[3] === buyer.state.turn, 10_000, "Baltic bought");
  await waitFor(async () => (await recordedSounds(page)).includes("property-buy.mp3"), 10_000, "buy sound");

  // --- Completed trade: the buyer hands Baltic to the other player, who accepts.
  const proposer = cur();
  const recipientIdx = proposer.state.players.findIndex((_: unknown, i: number) => i !== proposer.state.turn);
  proposer.send({ type: "proposeTrade", to: recipientIdx, offerProps: [3], requestProps: [], offerCash: 0, requestCash: 0 });
  await waitFor(() => other().state?.pendingTrade != null, 10_000, "trade proposed");
  other().send({ type: "respondTrade", accept: true });
  await waitFor(() => proposer.state?.pendingTrade == null && proposer.state?.owners?.[3] === recipientIdx, 10_000, "trade completed");
  await waitFor(async () => (await recordedSounds(page)).includes("trade-complete.mp3"), 10_000, "trade sound");

  const idxOf = (a: Actor) => a.state.players.findIndex((p: any) => p.id === a.id);
  const aliceIdx = idxOf(alice);
  const bobIdx = idxOf(bob);

  // --- Passing GO: teleport Alice just behind GO, then roll her past it.
  alice.admin({ kind: "setTurn", turn: aliceIdx });
  await waitFor(() => alice.state?.turn === aliceIdx && alice.state?.dice?.rolled === false, 10_000, "Alice's turn reset");
  alice.admin({ kind: "movePlayer", target: aliceIdx, position: 38 });
  await waitFor(() => alice.state?.players[aliceIdx].position === 38, 10_000, "Alice at 38");
  alice.admin({ kind: "forceDice", d1: 1, d2: 2 });
  await waitFor(() => alice.state?.riggedDice != null, 10_000, "GO rig set");
  alice.send({ type: "roll" });
  await waitFor(() => (alice.state?.lastGo?.id ?? 0) > 0, 10_000, "GO salary paid");
  await waitFor(async () => (await recordedSounds(page)).includes("pass-go.mp3"), 10_000, "GO sound");

  // --- Sent to Jail: teleport Bob so a 3 lands him on Go To Jail (space 30).
  alice.admin({ kind: "setTurn", turn: bobIdx });
  await waitFor(() => alice.state?.turn === bobIdx && alice.state?.dice?.rolled === false, 10_000, "Bob's turn reset");
  alice.admin({ kind: "movePlayer", target: bobIdx, position: 27 });
  await waitFor(() => alice.state?.players[bobIdx].position === 27, 10_000, "Bob at 27");
  alice.admin({ kind: "forceDice", d1: 1, d2: 2 });
  await waitFor(() => alice.state?.riggedDice != null, 10_000, "jail rig set");
  bob.send({ type: "roll" });
  await waitFor(() => bob.state?.players[bobIdx].jailed === true, 10_000, "Bob jailed");
  await waitFor(async () => (await recordedSounds(page)).includes("jail.mp3"), 10_000, "jail sound");

  const sounds = await recordedSounds(page);
  expect(sounds).toContain("dice-roll.mp3");
  expect(sounds).toContain("pawn-move.mp3");
  expect(sounds).toContain("property-buy.mp3");
  expect(sounds).toContain("trade-complete.mp3");
  expect(sounds).toContain("pass-go.mp3");
  expect(sounds).toContain("jail.mp3");

  alice.close();
  bob.close();
});
