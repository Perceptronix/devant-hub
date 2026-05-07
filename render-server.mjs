import { createServer } from "node:http";
import { Readable } from "node:stream";

import serverEntry from "./dist/server/index.js";

const port = Number(process.env.PORT ?? 3000);

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const server = createServer(async (request, response) => {
  try {
    const body = await readRequestBody(request);
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${port}`}`);
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