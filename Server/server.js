require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');
const mysql      = require('mysql2/promise');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// ════════════════════════════════════════════
//  CONEXIÓN MYSQL
// ════════════════════════════════════════════

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl:      { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection()
  .then(conn => { console.log('✅ MySQL conectado'); conn.release(); })
  .catch(err  => console.error('❌ Error MySQL:', err.message));

// ════════════════════════════════════════════
//  RUTAS HTML
// ════════════════════════════════════════════
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.get('/tracker', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'tracker.html'));
});

// ════════════════════════════════════════════
//  API — TRABAJADORES
// ════════════════════════════════════════════
app.get('/api/trabajadores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM trabajadores WHERE activo = 1');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trabajadores', async (req, res) => {
  const { nombre, emoji, rol, color, estado, lat, lng } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO trabajadores (nombre, emoji, rol, color, estado, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, emoji || '👤', rol || 'Empleado', color || '#00e5ff', estado || 'offline', lat || 0, lng || 0]
    );
    const [rows] = await pool.query('SELECT * FROM trabajadores WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/trabajadores/:id', async (req, res) => {
  try {
    await pool.query('UPDATE trabajadores SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Trabajador eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/historial/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM historial_ubicaciones WHERE trabajador_id = ? ORDER BY fecha DESC LIMIT 50',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════
//  SOCKET.IO — TIEMPO REAL
// ════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log(`✅ Cliente conectado: ${socket.id}`);

  socket.on('enviar-ubicacion', async (datos) => {
    try {
      await pool.query(
        'UPDATE trabajadores SET lat = ?, lng = ?, estado = ? WHERE id = ?',
        [datos.lat, datos.lng, 'online', datos.trabajadorId]
      );
      await pool.query(
        'INSERT INTO historial_ubicaciones (trabajador_id, lat, lng) VALUES (?, ?, ?)',
        [datos.trabajadorId, datos.lat, datos.lng]
      );
      io.emit('actualizar-ubicacion', datos);
    } catch (err) {
      console.error('Error guardando ubicación:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Desconectado: ${socket.id}`);
  });
});

// ════════════════════════════════════════════
//  ARRANQUE
// ════════════════════════════════════════════

app.get('/api/config', (req, res) => {
  res.json({
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'sw.js'));
});  