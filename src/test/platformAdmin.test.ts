import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

describe("administrator-only pelada creation", () => {
  beforeEach(() => rpc.mockReset());
  it("allows only a server-confirmed administrator", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const { result } = renderHook(() => usePlatformAdmin("admin-user"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "admin-user", _role: "admin" });
  });
  it("does not allow a player to create peladas", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const { result } = renderHook(() => usePlatformAdmin("player-user"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
  it("denies access when permission verification fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Unavailable" } });
    const { result } = renderHook(() => usePlatformAdmin("player-user"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
});