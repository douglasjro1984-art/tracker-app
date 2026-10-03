# Tracker app, control de estacionamiento

Aplicación web para controlar un estacionamiento, con un servidor Node.js, un cliente separado y comunicación en tiempo real mediante Socket.IO. Los datos se guardan en una base MySQL.

## Tecnologías

- Node.js y Express 4
- Socket.IO 4, para la comunicación en tiempo real entre el servidor y los clientes
- MySQL (`mysql2`)
- `dotenv`, para manejar las claves de conexión fuera del código

## Estructura

```
├── Server/         # Servidor Express y Socket.IO (server.js)
├── client/         # Aplicación cliente
├── migrar.js       # Script de migración de la base de datos
└── package.json    # Dependencias y scripts
```

## Cómo ejecutarlo en tu computadora

1. Cloná el repositorio e instalá las dependencias:

   ```bash
   git clone https://github.com/douglasjro1984-art/tracker-app.git
   cd tracker-app
   npm install
   ```

2. Creá una base de datos MySQL vacía y un archivo `.env` en la raíz del proyecto con los datos de conexión (servidor, usuario, contraseña y nombre de la base).

3. Ejecutá el script de migración de la base de datos:

   ```bash
   node migrar.js
   ```

4. Iniciá el servidor:

   ```bash
   npm start
   ```

   El comando ejecuta `node Server/server.js`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Inicia el servidor (`Server/server.js`) |

## Autor

**Douglas Romero**, desarrollador backend junior.
[GitHub](https://github.com/douglasjro1984-art) · [LinkedIn](https://www.linkedin.com/in/douglas-romero-574576384)
