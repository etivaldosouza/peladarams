import { describe, expect, it } from "vitest";
import { safeAuthDestination } from "@/lib/authDestination";

describe("login destination", () => {
  it("returns the player's pelada after signing in", () => {
    expect(safeAuthDestination("/p/pelada-da-semana")).toBe("/p/pelada-da-semana");
  });
  it("rejects external destinations", () => {
    expect(safeAuthDestination("//outside.example")).toBe("/minhas-peladas");
    expect(safeAuthDestination("/\\outside.example")).toBe("/minhas-peladas");
  });
});