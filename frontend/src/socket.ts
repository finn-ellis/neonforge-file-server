import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const socket: Socket = io(API_BASE_URL, {
  transports: ['websocket'],
});

export default socket;
