import { Server } from "socket.io";

import corsOptions from "../config/cors.config.js";

export const SOCKET_IO_PATH = "/socket.io";

export function createSocketServer(httpServer) {
  return new Server(httpServer, {
    path: SOCKET_IO_PATH,
    cors: corsOptions,
  });
}
