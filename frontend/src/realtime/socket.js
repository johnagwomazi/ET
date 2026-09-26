import { io } from "socket.io-client";

import { BACKEND_ORIGIN } from "../constants/app.constants";

export const SOCKET_IO_PATH = "/socket.io";

let socket;

export function getSocket() {
  if (!BACKEND_ORIGIN) {
    return null;
  }

  if (!socket) {
    socket = io(BACKEND_ORIGIN, {
      path: SOCKET_IO_PATH,
      withCredentials: true,
      autoConnect: false,
    });
  }

  return socket;
}

export function connectSocket() {
  const currentSocket = getSocket();

  if (currentSocket && !currentSocket.connected && !currentSocket.active) {
    currentSocket.connect();
  }

  return currentSocket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
