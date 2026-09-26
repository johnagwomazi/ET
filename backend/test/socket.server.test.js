import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";

import envConfig from "../src/config/env.config.js";
import { createSocketServer, SOCKET_IO_PATH } from "../src/socket/socket.server.js";

test("Socket.IO handles its polling handshake on the Express HTTP server", async () => {
  const app = express();
  app.get("/", (req, res) => res.json({ status: "running" }));

  const server = createServer(app);
  const io = createSocketServer(server);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();
  const serverOrigin = `http://127.0.0.1:${address.port}`;
  const frontendOrigin = String(envConfig.frontendUrl || "http://localhost:5173")
    .split(",")[0]
    .trim();

  try {
    const handshakeResponse = await fetch(
      `${serverOrigin}${SOCKET_IO_PATH}/?EIO=4&transport=polling`,
      { headers: { Origin: frontendOrigin } }
    );
    const handshakePacket = await handshakeResponse.text();

    assert.equal(handshakeResponse.status, 200);
    assert.equal(handshakeResponse.headers.get("access-control-allow-origin"), frontendOrigin);
    assert.match(handshakePacket, /^0\{"sid":/);

    const restResponse = await fetch(`${serverOrigin}/`);
    const restPayload = await restResponse.json();

    assert.equal(restResponse.status, 200);
    assert.equal(restPayload.status, "running");
  } finally {
    await new Promise((resolve) => io.close(resolve));
  }
});
