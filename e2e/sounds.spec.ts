import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * End-to-end check for the in-game sound effects (feat/add-sound).
 *
 * A browser page joins the room as a *spectator* — it renders the real client
 * and runs useGameSounds, so every sound is triggered by genuine state
 * broadcasts. Two players are driven deterministically over raw WebSockets
 * (the same protocol the app speaks) to produce each event: a dice roll, a pawn
 * move, a property purchase, and a completed trade. We assert the matching audio
 * file's play() was invoked on the page.
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

test("all four game events play their sound", async ({ page }) => {
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
  alice.send({ type: "rollForOrder" });
  bob.send({ type: "rollForOrder" });
  // The roll-off settles on a server alarm; nudge it and wait for "playing".
  await waitFor(() => {
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

  // Dice sound fires immediately; the move sound is delayed to sync with the pawn
  // walk (~700ms in usePawnPositions), so give it a moment.
  await waitFor(async () => (await recordedSounds(page)).includes("dice-roll.mp3"), 10_000, "dice sound");
  await waitFor(async () => (await recordedSounds(page)).includes("pawn-move.mp3"), 10_000, "move sound");

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

  const sounds = await recordedSounds(page);
  expect(sounds).toContain("dice-roll.mp3");
  expect(sounds).toContain("pawn-move.mp3");
  expect(sounds).toContain("property-buy.mp3");
  expect(sounds).toContain("trade-complete.mp3");

  alice.close();
  bob.close();
});
