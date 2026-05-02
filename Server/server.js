// ════════════════════════════════════════════
//  SERVER.JS — Servidor principal con Socket.io
// ════════════════════════════════════════════

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'tracker.html'));
});

const dispositivosConectados = {};

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  socket.on('enviar-ubicacion', (datos) => {
    dispositivosConectados[socket.id] = {
      id:     socket.id,
      nombre: datos.nombre,
      lat:    datos.lat,
      lng:    datos.lng,
      hora:   new Date().toLocaleTimeString(),
    };
    io.emit('actualizar-ubicacion', dispositivosConectados[socket.id]);
  });

  socket.on('disconnect', () => {
    if (dispositivosConectados[socket.id]) {
      io.emit('dispositivo-desconectado', socket.id);
      delete dispositivosConectados[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});