// /api/html2png.js
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { put } from "@vercel/blob";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const b = (req.method === "POST" ? req.body : req.query) || {};

    const html   = b.html ?? "<html><body><h1>Hola</h1></body></html>";
    const width  = Number(b.width ?? 1080);
    const height = Number(b.height ?? 1350);
    const dpr    = Number(b.dpr ?? 2);
    const wait   = b.wait ?? "networkidle0";

    // nombre y reglas de guardado
    const key = String(b.key ?? "poema.png");
    const overwrite = b.overwrite !== undefined
      ? (b.overwrite === true || b.overwrite === "true")
      : true; // por defecto, sobrescribe
    const addRandomSuffix = b.addRandomSuffix !== undefined
      ? (b.addRandomSuffix === true || b.addRandomSuffix === "true")
      : !overwrite; // si no sobrescribes, genera sufijo

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
    if (!token) return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN env var" });

    const { url } = await put(`ig/${key}`, buf, {
      access: "public",
      contentType: "image/png",
      cacheControlMaxAge: 0,
      allowOverwrite: overwrite,
      addRandomSuffix,
      token,
    });

    return res.status(200).json({
      url, key, width, height, dpr, overwrite, addRandomSuffix,
      contentType: "image/png",
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
