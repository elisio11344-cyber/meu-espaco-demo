import { NextResponse } from "next/server";
import type { Currency } from "@/lib/local-data";

type FrankfurterRate = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get("currencies")?.split(",").map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z]{3}$/.test(item)) ?? [];
    const supportedCurrencies: Currency[] = Array.from(new Set(requested.length ? requested : ["AUD", "BRL", "USD"])).slice(0, 20);
    const quotes = supportedCurrencies.filter((currency) => currency !== "EUR");
    if (quotes.length === 0) return NextResponse.json({ date: new Date().toISOString().slice(0, 10), rates: { EUR: 1 }, source: "Base EUR" });
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=EUR&quotes=${quotes.join(",")}`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`exchange_provider_${response.status}`);

    const data = await response.json() as FrankfurterRate[];
    const rates: Record<Currency, number> = Object.fromEntries(data.map((item) => [item.quote.toUpperCase(), item.rate]));
    rates.EUR = 1;
    const valid = supportedCurrencies.every((currency) => Number.isFinite(rates[currency]) && rates[currency] > 0);
    if (!valid) throw new Error("invalid_exchange_rates");

    return NextResponse.json({
      date: data[0]?.date,
      rates,
      source: "Frankfurter",
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível atualizar as cotações agora." },
      { status: 503 },
    );
  }
}
