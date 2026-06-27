import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateBoardConfig, type BoardConfig } from "@game/board";

// This route reads/writes the board source file on the local filesystem, so it
// only makes sense during local development. The deployed UI (Vercel) has a
// read-only, ephemeral filesystem — saving there is meaningless and is blocked.
export const runtime = "nodejs";

const CONFIG_PATH = path.join(process.cwd(), "game", "board.config.json");

const isLocal = () => process.env.NODE_ENV !== "production";

/** Re-serialize a config with stable key order and one space per line, so edits
 *  produce clean, minimal diffs in the committed file. */
function serialize(config: BoardConfig): string {
  const order = ["t", "name", "icon", "c", "price", "rent"] as const;
  const space = (s: BoardConfig["spaces"][number]) => {
    const pairs = order
      .filter((key) => s[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}: ${JSON.stringify(s[key])}`);
    return `    { ${pairs.join(", ")} }`;
  };
  const spaces = config.spaces.map(space).join(",\n");
  return `{\n  "startingCash": ${JSON.stringify(config.startingCash)},\n  "spaces": [\n${spaces}\n  ]\n}\n`;
}

export async function GET() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  return new NextResponse(raw, { headers: { "Content-Type": "application/json" } });
}

export async function POST(req: Request) {
  if (!isLocal()) {
    return NextResponse.json(
      { error: "The board editor only works in local development. Commit the JSON and open a PR to deploy it." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }
  try {
    validateBoardConfig(body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid board config." }, { status: 400 });
  }
  await writeFile(CONFIG_PATH, serialize(body), "utf8");
  return NextResponse.json({ ok: true, path: "game/board.config.json" });
}
