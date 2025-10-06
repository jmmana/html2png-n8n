import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { put } from "@vercel/blob";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const b = (req.method === "POST" ? req.body : req.query) || {};
    const html  = b.html ?? "<html><body><h1>Hola</h1></body></html>";
    const width = Number(b.width ?? 1080);
    const height= Number(b.height ?? 1350);
    const dpr   = Number(b.dpr ?? 2);
    const wait  = b.wait ?? "networkidle0";
    const key   = String(b.key ?? "poema.png");

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width, height, deviceScaleFactor: dpr },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: wait });
    const buf = await page.screenshot({ type: "png" });
    await browser.close();

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return res.status(500).send("Missing BLOB_READ_WRITE_TOKEN");

    const { url } = await put(`ig/${key}`, buf, {
      access: "public",
      contentType: "image/png",
      token,
      allowOverwrite: true,   // misma URL siempre; quítalo si prefieres URLs nuevas
      addRandomSuffix: false, // pon true si NO quieres sobrescribir
      cacheControlMaxAge: 0,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(url);  // <<< SOLO LA URL EN TEXTO
  } catch (e) {
    return res.status(500).send(String(e?.message || e));
  }
}
