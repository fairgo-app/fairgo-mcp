import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchExchangeRatesHandler } from "../../src/tools/fetch-exchange-rates.js";

function makeFetchMock(
  status: number,
  body: unknown,
  ok = true
): () => Promise<Response> {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as unknown as Response);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchExchangeRatesHandler", () => {
  it("returns isError when symbols is empty", async () => {
    const result = await fetchExchangeRatesHandler({ base: "AUD", symbols: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("non-empty");
  });

  it("inverts rates correctly (0.5940 → ~1.6835)", async () => {
    const mockFetch = makeFetchMock(200, {
      base: "AUD",
      date: "2024-01-15",
      rates: { USD: 0.5940 },
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["USD"],
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.exchangeRates[0].currency).toBe("USD");
    // 1 / 0.5940 = 1.68350168..., rounded to 4dp = 1.6835
    expect(payload.exchangeRates[0].rate).toBe(1.6835);
  });

  it("rounds rates to 4 decimal places", async () => {
    const mockFetch = makeFetchMock(200, {
      base: "AUD",
      date: "2024-01-15",
      rates: { EUR: 0.6000 },
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["EUR"],
    });

    const payload = JSON.parse(result.content[0].text);
    const rate = payload.exchangeRates[0].rate;
    // 1 / 0.6 = 1.6667 (4dp)
    const decimals = rate.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(4);
    expect(rate).toBe(Math.round((1 / 0.6) * 10000) / 10000);
  });

  it("returns isError on fetch network failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["USD"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Network error");
  });

  it("returns isError on non-ok HTTP response", async () => {
    const mockFetch = makeFetchMock(422, {}, false);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["USD"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("422");
  });

  it("includes hint in successful response", async () => {
    const mockFetch = makeFetchMock(200, {
      base: "AUD",
      date: "2024-01-15",
      rates: { USD: 0.65 },
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["USD"],
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.hint).toBeDefined();
    expect(payload.hint).toContain("inverted");
  });

  it("passes base, date and exchangeRates in result", async () => {
    const mockFetch = makeFetchMock(200, {
      base: "AUD",
      date: "2024-01-15",
      rates: { USD: 0.65, GBP: 0.52 },
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchExchangeRatesHandler({
      base: "AUD",
      symbols: ["USD", "GBP"],
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.base).toBe("AUD");
    expect(payload.date).toBe("2024-01-15");
    expect(payload.exchangeRates).toHaveLength(2);
  });
});
