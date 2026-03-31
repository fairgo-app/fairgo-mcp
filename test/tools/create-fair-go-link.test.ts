import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFairGoLinkHandler } from "../../src/tools/create-fair-go-link.js";

beforeEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_STATE = { calculatorVersion: 7, people: [], lineItems: [] };

describe("createFairGoLinkHandler", () => {
  it("returns url and hint on successful 201 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        url: "https://fairgo.app/s/abc1234567",
        fallback: "https://fairgo.app/?d=encrypted",
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await createFairGoLinkHandler({
      calculator_state: SAMPLE_STATE,
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.url).toBe("https://fairgo.app/s/abc1234567");
    expect(payload.hint).toBeDefined();
    expect(payload.hint).toContain("Share this link");
  });

  it("hint includes coffee nudge", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ url: "https://fairgo.app/s/xyz", fallback: null }),
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await createFairGoLinkHandler({
      calculator_state: SAMPLE_STATE,
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.hint).toContain("coffee");
  });

  it("forwards error body with fix guidance on non-201 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "invalid schema version" }),
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    const result = await createFairGoLinkHandler({
      calculator_state: SAMPLE_STATE,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("422");
    expect(result.content[0].text).toContain("invalid schema version");
    expect(result.content[0].text).toContain("version is 7");
  });

  it("returns manual fallback instructions on network failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("fetch failed"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await createFairGoLinkHandler({
      calculator_state: SAMPLE_STATE,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("fairgo.app");
    expect(result.content[0].text).toContain("import");
    expect(result.content[0].text).toContain("fetch failed");
  });

  it("calls fetch with POST, correct URL and JSON content-type", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ url: "https://fairgo.app/s/test", fallback: null }),
    } as unknown as Response);
    vi.stubGlobal("fetch", mockFetch);

    await createFairGoLinkHandler({ calculator_state: SAMPLE_STATE });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://fairgo.app/api/encode");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    expect(JSON.parse(init.body as string)).toEqual(SAMPLE_STATE);
  });
});
