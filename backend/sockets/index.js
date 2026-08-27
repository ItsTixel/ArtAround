const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const registerVisitSessionHandlers = require('./visitSession');

function initSocketServer(server) {
  const io = new Server(server);

  // Stessa identica sessione REST: il token JWT viaggia nel cookie httpOnly
  // "token" (vedi middlewares/verifyToken.js). cookie-parser è middleware
  // Express e non si applica all'handshake di socket.io, quindi va parsato
  // a mano dall'header Cookie grezzo.
  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const token = raw && cookie.parseCookie(raw).token;
      if (!token) return next(new Error('unauthorized'));

      const secretKey = process.env.JWT_SECRET;
      socket.user = jwt.verify(token, secretKey); // { id, role }
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => registerVisitSessionHandlers(io, socket));

  return io;
}

module.exports = { initSocketServer };
