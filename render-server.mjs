import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import serverEntry from "./dist/server/index.js";

const port = Number(process.env.PORT ?? 3000);
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const clientDir = resolve(projectRoot, "dist/client");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".map", "application/json; charset=utf-8"],
]);

async function serveStaticFile(request, response, pathname) {
  const normalizedPath = normalize(pathname).replace(/^([.][.][/\\])+/, "");
  const filePath = resolve(clientDir, `.${normalizedPath}`);

  if (!filePath.startsWith(clientDir)) {
    return false;
  }

  try {
    await access(filePath);
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  response.statusCode = 200;
  response.setHeader("content-type", contentTypes.get(extname(filePath)) ?? "application/octet-stream");
  response.setHeader("cache-control", "public, max-age=31536000, immutable");

  if (request.method === "HEAD") {
    response.end();
    return true;
  }

  createReadStream(filePath).pipe(response);
  return true;
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${port}`}`);
    if (url.pathname === "/" || url.pathname.startsWith("/assets/") || ["/favicon.svg", "/manifest.webmanifest"].includes(url.pathname)) {
      const servedStatic = await serveStaticFile(request, response, url.pathname === "/" ? "/index.html" : url.pathname);
      if (servedStatic) {
        return;
      }
    }

    const body = await readRequestBody(request);
    const fetchRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
      body,
      duplex: body ? "half" : undefined,
    });

    const handler = serverEntry.default ?? serverEntry;
    const fetchResponse = await handler.fetch(fetchRequest, {}, {});

    response.statusCode = fetchResponse.status;
    response.statusMessage = fetchResponse.statusText;

    fetchResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    if (fetchResponse.body) {
      Readable.fromWeb(fetchResponse.body).pipe(response);
      return;
    }

    response.end();
  } catch (error) {
    console.error(error);
    response.statusCode = 500;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`Render server listening on port ${port}`);
});