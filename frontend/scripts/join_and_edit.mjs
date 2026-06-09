import { io } from "socket.io-client";
import axios from "axios";

const [,, roomId, token] = process.argv;
if (!roomId || !token) {
  console.error('Usage: node join_and_edit.mjs <roomId> <token>');
  process.exit(1);
}

const socket = io("http://localhost:5000", { auth: { token } });

socket.on('connect', () => {
  console.log('socket connected');
  socket.emit('join-room', roomId, (res) => {
    console.log('join-room ack', res);
    const content = `E2E content updated at ${new Date().toISOString()}`;
    socket.emit('content-update', roomId, content);
    console.log('sent content-update');

    setTimeout(async () => {
      try {
        const resp = await axios.post(`http://localhost:5000/api/rooms/${roomId}/publish`, {}, { headers: { Authorization: `Bearer ${token}` } });
        console.log('publish response', resp.data);
      } catch (err) {
        console.error('publish error', err.response?.data || err.message);
      } finally {
        socket.disconnect();
        process.exit(0);
      }
    }, 2500);
  });
});

socket.on('content-update', (payload) => console.log('received content-update', payload));
socket.on('room-published', (a) => console.log('room-published', a));
