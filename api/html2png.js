import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { put } from "@vercel/blob";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const {
      html = "<html><body><h1>Hola</h1></body></html>",
      width = 1080,
      height = 1080,
      dpr = 2,
      wait = "networkidle0",
      key = "poema.png",
      overwrite = true,
    } = (req.method === "POST" ? req.body : req.query) || {};

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: parseInt(width),
        height: parseInt(height),
        deviceScaleFactor: parseFloat(dpr),
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: wait });
    const buf = await page.screenshot({ type: "png" });
    await browser.close();

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN env var");

    const { url } = await put(`ig/${key}`, buf, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: !overwrite, // true => URL nueva cada vez
      cacheControlMaxAge: 0,
      token,                      // <- ¡ESTO ES CLAVE!
    });

    res.status(200).json({ url, key, width: parseInt(width), height: parseInt(height) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
