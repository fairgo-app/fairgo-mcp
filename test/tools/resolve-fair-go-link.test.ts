import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveFairGoLinkHandler } from "../../src/tools/resolve-fair-go-link.js";

beforeEach(() => {
  vi.unstubAllGlobals();
});

const VALID_KEY = "abcDEF1234";

describe("resolveFairGoLinkHandler", () => {
  it("returns found status for a valid key that resolves", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await resolveFairGoLinkHandler({ key: VALID_KEY });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.status).toBe("found");
    expect(payload.key).toBe(VALID_KEY);
    expect(payload.hint).toContain("encrypted");
  });

  it("returns isError with expired message on 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await resolveFairGoLinkHandler({ key: VALID_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("expired");
    expect(result.content[0].text).toContain("90-day TTL");
  });

  it("rejects key shorter than 10 characters", async () => {
    const result = await resolveFairGoLinkHandler({ key: "short" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid key format");
  });

  it("rejects key longer than 10 characters", async () => {
    const result = await resolveFairGoLinkHandler({ key: "toolongkey123" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid key format");
  });

  it("rejects key with non-alphanumeric characters", async () => {
    const result = await resolveFairGoLinkHandler({ key: "abc-DE_123" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid key format");
  });

  it("calls the correct URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    await resolveFairGoLinkHandler({ key: VALID_KEY });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(`https://fairgo.app/api/resolve/${VALID_KEY}`);
  });

  it("returns isError on network failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("timeout"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await resolveFairGoLinkHandler({ key: VALID_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("timeout");
  });
});
