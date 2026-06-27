import { describe, expect, it } from "vitest";
import { clearIdentity, getClientId, getName, setName } from "@/lib/identity";

describe("getClientId", () => {
  it("creates a stable id and reuses it on subsequent calls", () => {
    const first = getClientId();
    expect(first).toMatch(/[0-9a-f-]{36}/);
    expect(getClientId()).toBe(first);
  });
});

describe("display name", () => {
  it("defaults to an empty string", () => {
    expect(getName()).toBe("");
  });

  it("stores a trimmed name", () => {
    setName("  Ada  ");
    expect(getName()).toBe("Ada");
  });

  it("clears the name but keeps the client id", () => {
    const id = getClientId();
    setName("Ada");
    clearIdentity();
    expect(getName()).toBe("");
    expect(getClientId()).toBe(id);
  });
});
