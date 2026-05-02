const mysql = require('mysql2/promise');

async function migrar() {
  // Conexión local
  const local = await mysql.createConnection({
    host: '127.0.0.1', port: 3306,
    user: 'root', password: '',
    database: 'tracker_db'
  });

  // Conexión Clever Cloud
  const cloud = await mysql.createConnection({
    host:     'b3f2hzn1o5389p2xzlua-mysql.services.clever-cloud.com',
    port:     3306,
    user:     'ue5rdpaxyobcsg5x',
    password: 'qjUfdpLIwGcby10mE2tH',
    database: 'b3f2hzn1o5389p2xzlua',
    ssl:      { rejectUnauthorized: false }
  });

  const [trabajadores] = await local.query('SELECT * FROM trabajadores WHERE activo = 1');
  
  for (const t of trabajadores) {
    await cloud.execute(
      'INSERT INTO trabajadores (nombre, emoji, rol, color, estado, lat, lng, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [t.nombre, t.emoji, t.rol, t.color, t.estado, t.lat, t.lng, t.activo]
    );
    console.log(`✅ Migrado: ${t.nombre}`);
  }

  await local.end();
  await cloud.end();
  console.log('✅ Migración completa');
}

migrar().catch(console.error);