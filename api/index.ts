import type { VercelRequest, VercelResponse } from "@vercel/node";

// Import the server entry from your built output
const serverEntry = require("../dist/server/index.js");

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const response = await serverEntry.fetch(
      new Request(new URL(req.url || "/", `http://${req.headers.host}`), {
        method: req.method,
        headers: req.headers as any,
        body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      }),
      {},
      {}
    );

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.send(await response.text());
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
