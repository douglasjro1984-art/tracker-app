// ════════════════════════════════════════════
//  SERVER.JS — Servidor principal con Socket.io
// ════════════════════════════════════════════

const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');  // importamos Socket.io

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);        // conectamos Socket.io al servidor

// ── Servimos los archivos del frontend ───────
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── Ruta principal (tu mapa) ─────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ── Ruta para el empleado (su página de rastreo) ──
app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'tracker.html'));
});

// ════════════════════════════════════════════
//  SOCKET.IO — Comunicación en tiempo real
// ════════════════════════════════════════════

// Guardamos los dispositivos conectados
const dispositivosConectados = {};

io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  // ── Empleado manda su ubicación ─────────────
  // Esto se ejecuta cada vez que un celular manda coordenadas
  socket.on('enviar-ubicacion', (datos) => {
    console.log(`📍 Ubicación de ${datos.nombre}: ${datos.lat}, ${datos.lng}`);

    // Guardamos/actualizamos el dispositivo
    dispositivosConectados[socket.id] = {
      id:     socket.id,
      nombre: datos.nombre,
      lat:    datos.lat,
      lng:    datos.lng,
      hora:   new Date().toLocaleTimeString(),
    };

    // Mandamos la ubicación a TODOS los que tienen el mapa abierto
    io.emit('actualizar-ubicacion', dispositivosConectados[socket.id]);
  });

  // ── Cliente se desconecta ────────────────────
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);

    if (dispositivosConectados[socket.id]) {
      // Avisamos al mapa que ese dispositivo se fue
      io.emit('dispositivo-desconectado', socket.id);
      delete dispositivosConectados[socket.id];
    }
  });
});

// ── Arrancamos el servidor ───────────────────
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 Página del empleado: http://localhost:${PORT}/tracker`);
});