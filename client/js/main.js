// ════════════════════════════════════════════
//  MAIN.JS — App de rastreo con mapa real
// ════════════════════════════════════════════

// ── Datos iniciales ──────────────────────────
let datosIniciales = [
  { id:1, nombre:'María García', emoji:'👩', rol:'Supervisora',  color:'#00e5ff', estado:'online',  bateria:82, velocidad:0.8, lat:19.432, lng:-99.133 },
  { id:2, nombre:'Carlos López', emoji:'👨', rol:'Chofer',        color:'#ff4d6d', estado:'online',  bateria:47, velocidad:1.2, lat:19.441, lng:-99.121 },
  { id:3, nombre:'Sofía Ruiz',   emoji:'👧', rol:'Técnica',       color:'#7cff6b', estado:'online',  bateria:93, velocidad:0.5, lat:19.428, lng:-99.148 },
  { id:4, nombre:'Juan Méndez',  emoji:'🧑', rol:'Repartidor',    color:'#ffc832', estado:'away',    bateria:15, velocidad:0,   lat:19.445, lng:-99.140 },
];

// ── Socket.io: recibe ubicaciones en tiempo real ──
const socket = io();

// Cuando llega una nueva ubicación de un empleado
socket.on('actualizar-ubicacion', (datos) => {
  // Buscamos si ya existe ese dispositivo
  let device = dispositivos.find(d => d.id === datos.id);

  if (device) {
    // Ya existe → actualizamos su posición
    device.actualizarPosicion(datos.lat, datos.lng);
    if (marcadores[device.id]) {
      marcadores[device.id].setLatLng([datos.lat, datos.lng]);
    }
  } else {
    // Es nuevo → lo agregamos al mapa
    const nuevo = new Device({
      id:        datos.id,
      nombre:    datos.nombre,
      emoji:     '📱',
      rol:       'Empleado',
      color:     '#00e5ff',
      estado:    'online',
      bateria:   100,
      velocidad: 0,
      lat:       datos.lat,
      lng:       datos.lng,
    });
    dispositivos.push(nuevo);
    agregarMarcador(nuevo);
  }

  renderizarLista();
});

// Cuando un empleado se desconecta
socket.on('dispositivo-desconectado', (id) => {
  const device = dispositivos.find(d => d.id === id);
  if (device) {
    device.estado = 'offline';
    renderizarLista();
  }
});

// ── Creamos objetos Device ────────────────────
let dispositivos = datosIniciales.map(d => new Device(d));

// ── Estado ────────────────────────────────────
let idSeleccionado = 1;
let contadorId     = 10; // para nuevos dispositivos
let marcadores     = {}; // guarda los marcadores de Leaflet

// ── Inicializamos el MAPA REAL (Leaflet) ─────
// Iniciamos el mapa sin posición fija todavía
const mapa = L.map('mapa').setView([-26.82, -65.20], 13);

// Pedimos la ubicación real al navegador
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Centramos el mapa en tu ubicación real
      mapa.setView([lat, lng], 15);

      // Marcador de "Yo estoy aquí"
      if (!window.miUbicacion) {
        window.miUbicacion = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:20px; height:20px;
              background:#00e5ff;
              border-radius:50%;
              border:3px solid white;
              box-shadow: 0 0 12px #00e5ff;
            "></div>`,
            iconSize:   [20, 20],
            iconAnchor: [10, 10],
          })
        }).addTo(mapa).bindTooltip('📍 Vos', { permanent: true, direction: 'top' });
      } else {
        window.miUbicacion.setLatLng([lat, lng]);
      }
    },
    (error) => {
      console.warn('No se pudo obtener ubicación:', error.message);
    },
    {
      enableHighAccuracy: true,  // usa GPS si está disponible
      maximumAge: 5000,          // acepta ubicación de hasta 5 seg atrás
      timeout: 10000             // espera hasta 10 seg
    }
  );
}
// Capa de mapa oscuro (CartoDB Dark)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO',
  maxZoom: 19
}).addTo(mapa);

// ── Función: crear ícono personalizado ────────
function crearIcono(device) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 36px; height: 36px;
        border-radius: 50%;
        background: ${device.color}22;
        border: 2.5px solid ${device.color};
        display: flex; align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 0 10px ${device.color}66;
      ">${device.emoji}</div>
    `,
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
  });
}

// ── Función: agregar marcador al mapa ─────────
function agregarMarcador(device) {
  const marcador = L.marker([device.lat, device.lng], {
    icon: crearIcono(device)
  }).addTo(mapa);

  // Tooltip con el nombre
  marcador.bindTooltip(`<b>${device.nombre}</b><br>${device.rol}`, {
    permanent: false,
    direction: 'top',
    className: 'tooltip-custom'
  });

  // Al hacer clic en el marcador selecciona el dispositivo
  marcador.on('click', () => {
    idSeleccionado = device.id;
    actualizarInfoPanel(device);
    renderizarLista();
  });

  marcadores[device.id] = marcador;
}

// ── Inicializamos marcadores ──────────────────
dispositivos.forEach(d => agregarMarcador(d));

// ── Reloj ─────────────────────────────────────
setInterval(() => {
  document.getElementById('reloj').textContent =
    new Date().toLocaleTimeString();
}, 1000);

// ── Elimina un dispositivo ────────────────────
function eliminarDispositivo(id) {
  const device = dispositivos.find(d => d.id === id);
  if (!device) return;

  // Confirmación antes de borrar
  const confirmar = confirm(`¿Eliminar a ${device.nombre}?`);
  if (!confirmar) return;

  // Quitamos el marcador del mapa
  if (marcadores[id]) {
    mapa.removeLayer(marcadores[id]);
    delete marcadores[id];
  }

  // Quitamos el dispositivo de la lista
  dispositivos = dispositivos.filter(d => d.id !== id);

  // Si era el seleccionado, seleccionamos el primero que quede
  if (idSeleccionado === id) {
    if (dispositivos.length > 0) {
      idSeleccionado = dispositivos[0].id;
      actualizarInfoPanel(dispositivos[0]);
    } else {
      // No quedan dispositivos
      document.getElementById('info-nombre').textContent = 'Sin dispositivos';
      document.getElementById('info-rol').textContent    = '';
      document.getElementById('info-lat').textContent    = '--';
      document.getElementById('info-lng').textContent    = '--';
      document.getElementById('info-vel').textContent    = '--';
      document.getElementById('info-bat').textContent    = '--';
      document.getElementById('info-estado').textContent = '--';
    }
  }

  renderizarLista();
}

// ── Renderiza lista del sidebar ───────────────
function renderizarLista(filtro = '') {
  const lista = document.getElementById('listaDispositivos');
  lista.innerHTML = '';

  dispositivos
    .filter(d => d.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .forEach(device => {
      const li = document.createElement('li');
      li.className = `device-item ${device.id === idSeleccionado ? 'activo' : ''}`;
      li.innerHTML = `
        <div class="device-top">
          <span class="device-badge badge-${device.estado}">${device.estado}</span>
          <button class="btn-eliminar" data-id="${device.id}">✖ Eliminar</button>
        </div>
        <div class="device-nombre">${device.emoji} ${device.nombre}</div>
        <div class="device-coords">
          ${device.lat.toFixed(4)}° N &nbsp; ${Math.abs(device.lng).toFixed(4)}° W
        </div>
      `;

      // Seleccionar dispositivo al hacer clic en la tarjeta
      li.addEventListener('click', (e) => {
        // Si hizo clic en el botón eliminar, no seleccionamos
        if (e.target.classList.contains('btn-eliminar')) return;

        idSeleccionado = device.id;
        actualizarInfoPanel(device);
        renderizarLista(filtro);
        mapa.setView([device.lat, device.lng], 15, { animate: true });
      });

      // Botón eliminar
      li.querySelector('.btn-eliminar').addEventListener('click', (e) => {
        e.stopPropagation();
        eliminarDispositivo(device.id);
      });

      lista.appendChild(li);
    });

  document.getElementById('totalDispositivos').textContent   = dispositivos.length;
  document.getElementById('dispositivosOnline').textContent  = dispositivos.filter(d => d.estado === 'online').length;
  document.getElementById('dispositivosOffline').textContent = dispositivos.filter(d => d.estado !== 'online').length;
}

// ── Actualiza panel info ──────────────────────
function actualizarInfoPanel(device) {
  document.getElementById('info-nombre').textContent = `${device.emoji} ${device.nombre}`;
  document.getElementById('info-rol').textContent    = device.rol;
  document.getElementById('info-lat').textContent    = device.lat.toFixed(5);
  document.getElementById('info-lng').textContent    = device.lng.toFixed(5);
  document.getElementById('info-vel').textContent    = device.obtenerVelocidadKmh();
  document.getElementById('info-bat').textContent    = device.bateria + '%';
  document.getElementById('info-estado').textContent = device.obtenerEstadoTexto();
  document.getElementById('info-estado').style.color = device.obtenerColorEstado();
}
// ── Actualiza historial visual ──
function actualizarHistorial(device) {
  const lista = document.getElementById('historialLista');
  lista.innerHTML = '';

  // Tomamos las últimas 8 posiciones del historial
  const ultimas = [...device.historial].reverse().slice(0, 8);

  if (ultimas.length === 0) {
    lista.innerHTML = '<div class="historial-item">Sin movimientos aún</div>';
    return;
  }

  ultimas.forEach((pos, i) => {
    const div = document.createElement('div');
    div.className = 'historial-item';
    div.innerHTML = `
      <span>#${ultimas.length - i}</span>
      <span>${pos.lat.toFixed(4)}° N</span>
      <span>${Math.abs(pos.lng).toFixed(4)}° W</span>
    `;
    lista.appendChild(div);
  });
}
// ── Buscador ──────────────────────────────────
document.getElementById('buscador').addEventListener('input', e => {
  renderizarLista(e.target.value);
});

// ── Modal: agregar dispositivo ────────────────
document.getElementById('btnAgregar').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('btnCancelar').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('btnGuardar').addEventListener('click', () => {
  const nombre = document.getElementById('form-nombre').value.trim();
  const rol    = document.getElementById('form-rol').value.trim();
  const lat    = parseFloat(document.getElementById('form-lat').value);
  const lng    = parseFloat(document.getElementById('form-lng').value);
  const estado = document.getElementById('form-estado').value;

  // Validación básica
  if (!nombre || isNaN(lat) || isNaN(lng)) {
    alert('⚠️ Completá todos los campos correctamente');
    return;
  }

  // Colores disponibles para nuevos dispositivos
  const colores = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8'];
  const emojis  = ['👤','🧑','👷','🚗','🏍️','📦'];

  contadorId++;
  const nuevoDispo = new Device({
    id:        contadorId,
    nombre:    nombre,
    emoji:     emojis[contadorId % emojis.length],
    rol:       rol || 'Empleado',
    color:     colores[contadorId % colores.length],
    estado:    estado,
    bateria:   100,
    velocidad: estado === 'online' ? 0.5 : 0,
    lat:       lat,
    lng:       lng,
  });

  dispositivos.push(nuevoDispo);
  agregarMarcador(nuevoDispo);
  renderizarLista();

  // Cerramos el modal y limpiamos
  document.getElementById('modal').style.display = 'none';
  document.getElementById('form-nombre').value = '';
  document.getElementById('form-rol').value    = '';
  document.getElementById('form-lat').value    = '';
  document.getElementById('form-lng').value    = '';

  // Centramos el mapa en el nuevo dispositivo
  mapa.setView([lat, lng], 15, { animate: true });
  idSeleccionado = contadorId;
  actualizarInfoPanel(nuevoDispo);
});

// ── Loop: actualiza posiciones en el mapa ─────
function loop() {
  dispositivos.forEach(device => {
    device.simularMovimiento();

    // Actualizamos la posición del marcador en el mapa real
    if (marcadores[device.id]) {
      marcadores[device.id].setLatLng([device.lat, device.lng]);
    }
  });

  // Actualizamos el panel del dispositivo seleccionado
  const sel = dispositivos.find(d => d.id === idSeleccionado);
  if (sel) {
  actualizarInfoPanel(sel);
  actualizarHistorial(sel);
};

  renderizarLista(document.getElementById('buscador').value);

  setTimeout(loop, 1000); // actualiza cada 1 segundo
}

// ── Arranque ──────────────────────────────────
renderizarLista();
actualizarInfoPanel(dispositivos[0]);
loop();