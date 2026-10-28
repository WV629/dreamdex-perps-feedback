import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"

const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
const c: any = ex.client
const j = (o: any) => JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v))
const perps = await c.listPerpMarkets()
const btc = perps.find((m: any) => m.baseSymbol === "BTC")
const log: string[] = []
const P = (s: string) => { console.log(s); log.push(s) }
P(`run at ${new Date().toISOString()} unix ${Math.floor(Date.now() / 1000)} pool ${btc.poolAddress}`)
for (const iv of [3600, 14400, 86400, 60, 0, -3600, 1.5, 7200, NaN]) {
  try { const r = await c.listFundingRateCandles(btc.poolAddress, iv, { limit: 2 }); P(`interval ${iv}: OK rows=${r.length} ${r.length ? "first bucketStart=" + r[0].bucketStart : ""}`) } catch (e: any) { P(`interval ${iv}: ${e.name} ${e.message.slice(0, 200)}`) }
}
for (const lim of [0, -1, 1.5, 5000, NaN]) {
  try { const r = await c.listFundingRateCandles(btc.poolAddress, 3600, { limit: lim }); P(`limit ${lim}: OK rows=${r.length}`) } catch (e: any) { P(`limit ${lim}: ${e.name} ${e.message.slice(0, 200)}`) }
}
for (const lim of [0, -1, 1.5, 5000]) {
  try { const r = await c.listFundingRateHistory(btc.poolAddress, { limit: lim }); P(`history limit ${lim}: OK rows=${r.length}`) } catch (e: any) { P(`history limit ${lim}: ${e.name} ${e.message.slice(0, 200)}`) }
}
// in-progress bucket dilution
const cs = await c.listFundingRateCandles(btc.poolAddress, 3600, { limit: 3 })
const hist = await c.listFundingRateHistory(btc.poolAddress, { limit: 3 })
P("candles " + j(cs.map((x: any) => ({ bucketStart: x.bucketStart, avg8h: x.avgFundingRate8h, min8h: x.minFundingRate8h, max8h: x.maxFundingRate8h, coverage: x.coverage, updateCount: x.updateCount }))))
P("raw settlements " + j(hist.map((x: any) => ({ ts: x.timestamp, fundingRate: x.fundingRate, spanStart: x.spanStart, spanEnd: x.spanEnd, tx: x.txHash }))))
for (const [n, iv] of [["4h", 14400], ["1d", 86400]] as const) {
  const r = await c.listFundingRateCandles(btc.poolAddress, iv, { limit: 2 })
  P(`${n} ` + j(r.map((x: any) => ({ bucketStart: x.bucketStart, avg8h: x.avgFundingRate8h, min8h: x.minFundingRate8h, max8h: x.maxFundingRate8h, coverage: x.coverage }))))
}

await ex.close()
