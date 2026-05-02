// ════════════════════════════════════════════
//  MAIN.JS — Conectado a MySQL via API REST
// ════════════════════════════════════════════

const socket = io();
let dispositivos   = [];
let marcadores     = {};
let idSeleccionado = null;

// ── Mapa real ────────────────────────────────
const mapa = L.map('mapa').setView([-26.82, -65.20], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap © CARTO',
  maxZoom: 19
}).addTo(mapa);

// ── Mi ubicación (punto azul) ─────────────────
if (navigator.geolocation) {
  navigator.geolocation.watchPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    mapa.setView([lat, lng], 15);
    if (!window.miUbicacion) {
      window.miUbicacion = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:16px;height:16px;background:#00e5ff;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #00e5ff"></div>`,
          iconSize: [16,16], iconAnchor: [8,8]
        })
      }).addTo(mapa).bindTooltip('📍 Vos', { permanent: true, direction: 'top' });
    } else {
      window.miUbicacion.setLatLng([lat, lng]);
    }
  }, null, { enableHighAccuracy: true });
}

// ════════════════════════════════════════════
//  CARGAR TRABAJADORES DESDE LA BASE DE DATOS
// ════════════════════════════════════════════
async function cargarTrabajadores() {
  try {
    const res  = await fetch('/api/trabajadores');
    const data = await res.json();

    // Limpiamos marcadores viejos del mapa
    Object.values(marcadores).forEach(m => mapa.removeLayer(m));
    marcadores    = {};
    dispositivos  = [];

    data.forEach(t => {
      // Creamos objeto Device con datos de la BD
      const device = new Device({
        id:        t.id,
        nombre:    t.nombre,
        emoji:     t.emoji,
        rol:       t.rol,
        color:     t.color,
        estado:    t.estado,
        bateria:   t.bateria || 100,
        velocidad: t.estado === 'online' ? 0.5 : 0,
        lat:       parseFloat(t.lat),
        lng:       parseFloat(t.lng),
      });
      dispositivos.push(device);
      agregarMarcador(device);
    });

    // Seleccionamos el primero por defecto
    if (dispositivos.length > 0 && !idSeleccionado) {
      idSeleccionado = dispositivos[0].id;
      actualizarInfoPanel(dispositivos[0]);
    }

    renderizarLista();
  } catch (err) {
    console.error('Error cargando trabajadores:', err);
  }
}

// ════════════════════════════════════════════
//  MARCADORES EN EL MAPA
// ════════════════════════════════════════════
function agregarMarcador(device) {
  const marcador = L.marker([device.lat, device.lng], {
    icon: L.divIcon({
      className: '',
      html: `
        <div style="
          width:36px; height:36px;
          border-radius:50%;
          background:${device.color}22;
          border:2.5px solid ${device.color};
          display:flex; align-items:center;
          justify-content:center;
          font-size:16px;
          box-shadow:0 0 10px ${device.color}66;
        ">${device.emoji}</div>
      `,
      iconSize: [36,36], iconAnchor: [18,18],
    })
  }).addTo(mapa);

  marcador.bindTooltip(`<b>${device.nombre}</b><br>${device.rol}`, {
    direction: 'top', className: 'tooltip-custom'
  });

  marcador.on('click', () => {
    idSeleccionado = device.id;
    actualizarInfoPanel(device);
    renderizarLista();
    mapa.setView([device.lat, device.lng], 16, { animate: true });
  });

  marcadores[device.id] = marcador;
}

// ════════════════════════════════════════════
//  ELIMINAR TRABAJADOR
// ════════════════════════════════════════════
async function eliminarDispositivo(id) {
  const device = dispositivos.find(d => d.id === id);
  if (!device) return;

  const confirmar = confirm(`¿Eliminar a ${device.nombre}?`);
  if (!confirmar) return;

  try {
    // Llamamos a la API para eliminarlo de la BD
    await fetch(`/api/trabajadores/${id}`, { method: 'DELETE' });

    // Quitamos el marcador del mapa
    if (marcadores[id]) {
      mapa.removeLayer(marcadores[id]);
      delete marcadores[id];
    }

    // Quitamos de la lista local
    dispositivos = dispositivos.filter(d => d.id !== id);

    // Seleccionamos otro si quedaron
    if (idSeleccionado === id) {
      idSeleccionado = dispositivos.length > 0 ? dispositivos[0].id : null;
      if (idSeleccionado) actualizarInfoPanel(dispositivos[0]);
    }

    renderizarLista();
  } catch (err) {
    console.error('Error eliminando:', err);
  }
}

// ════════════════════════════════════════════
//  AGREGAR TRABAJADOR
// ════════════════════════════════════════════
document.getElementById('btnAgregar').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'flex';
});

document.getElementById('btnCancelar').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('btnGuardar').addEventListener('click', async () => {
  const nombre   = document.getElementById('form-nombre').value.trim();
  const rol      = document.getElementById('form-rol').value.trim();
  const telefono = document.getElementById('form-telefono').value.trim();
  const estado   = document.getElementById('form-estado').value;

  if (!nombre || !telefono) {
    alert('⚠️ Completá el nombre y el teléfono');
    return;
  }

  const colores = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff922b','#cc5de8'];
  const emojis  = ['👤','🧑','👷','🚗','🏍️','📦'];
  const idx     = dispositivos.length % colores.length;

  try {
    const res = await fetch('/api/trabajadores', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        emoji:  emojis[idx],
        rol:    rol || 'Empleado',
        color:  colores[idx],
        estado: 'offline',
        lat: 0, lng: 0,
      })
    });

    const nuevo = await res.json();

    // ── Obtenemos la URL pública del servidor ──
    const configRes = await fetch('/api/config');
    const config    = await configRes.json();
    const baseUrl   = config.publicUrl;

    // ── Generamos el link con la URL pública ──
    const linkTracker = `${baseUrl}/tracker?id=${nuevo.id}&nombre=${encodeURIComponent(nombre)}`;

    // ── Mensaje de WhatsApp ──
    const mensaje = `Hola ${nombre} 👋\n\nTe invitamos a activar tu rastreo de ubicación para el trabajo.\n\nHacé clic en el siguiente link, aceptá el permiso de ubicación y listo:\n\n${linkTracker}\n\nSolo tomará unos segundos ✅`;

    const whatsappUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    const device = new Device({
      id:        nuevo.id,
      nombre:    nuevo.nombre,
      emoji:     nuevo.emoji,
      rol:       nuevo.rol,
      color:     nuevo.color,
      estado:    'offline',
      bateria:   100,
      velocidad: 0,
      lat:       -26.82,
      lng:       -65.20,
    });

    dispositivos.push(device);
    agregarMarcador(device);
    idSeleccionado = device.id;
    actualizarInfoPanel(device);
    renderizarLista();

    document.getElementById('modal').style.display  = 'none';
    document.getElementById('form-nombre').value    = '';
    document.getElementById('form-rol').value       = '';
    document.getElementById('form-telefono').value  = '';

    window.open(whatsappUrl, '_blank');

  } catch (err) {
    console.error('Error:', err);
    alert('❌ Error al guardar');
  }
});


// ════════════════════════════════════════════
//  LISTA DEL SIDEBAR
// ════════════════════════════════════════════
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

      li.addEventListener('click', e => {
        if (e.target.classList.contains('btn-eliminar')) return;
        idSeleccionado = device.id;
        actualizarInfoPanel(device);
        renderizarLista(filtro);
        mapa.setView([device.lat, device.lng], 15, { animate: true });
        cargarHistorial(device.id);
        cerrarSidebarMovil(); // ← esta línea
      });

      li.querySelector('.btn-eliminar').addEventListener('click', e => {
        e.stopPropagation();
        eliminarDispositivo(device.id);
      });

      lista.appendChild(li);
    });

  document.getElementById('totalDispositivos').textContent   = dispositivos.length;
  document.getElementById('dispositivosOnline').textContent  = dispositivos.filter(d => d.estado === 'online').length;
  document.getElementById('dispositivosOffline').textContent = dispositivos.filter(d => d.estado !== 'online').length;
}

// ════════════════════════════════════════════
//  PANEL INFO Y HISTORIAL
// ════════════════════════════════════════════
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

async function cargarHistorial(trabajadorId) {
  try {
    const res  = await fetch(`/api/historial/${trabajadorId}`);
    const data = await res.json();
    const lista = document.getElementById('historialLista');
    lista.innerHTML = '';

    if (data.length === 0) {
      lista.innerHTML = '<div class="historial-item">Sin movimientos aún</div>';
      return;
    }

    data.slice(0, 8).forEach((pos, i) => {
      const div = document.createElement('div');
      div.className = 'historial-item';
      const hora = new Date(pos.fecha).toLocaleTimeString();
      div.innerHTML = `
        <span>#${i + 1}</span>
        <span>${parseFloat(pos.lat).toFixed(4)}°N</span>
        <span>${Math.abs(parseFloat(pos.lng)).toFixed(4)}°W</span>
        <span>${hora}</span>
      `;
      lista.appendChild(div);
    });
  } catch (err) {
    console.error('Error cargando historial:', err);
  }
}

// ════════════════════════════════════════════
//  SOCKET.IO — RECIBE UBICACIONES EN TIEMPO REAL
// ════════════════════════════════════════════
socket.on('actualizar-ubicacion', (datos) => {
  const device = dispositivos.find(d => d.id == datos.trabajadorId);
  if (!device) return;

  device.actualizarPosicion(datos.lat, datos.lng);
  device.estado    = 'online';
  device.velocidad = 0.5;

  if (marcadores[device.id]) {
    marcadores[device.id].setLatLng([datos.lat, datos.lng]);
    // Actualizamos el ícono para mostrar que está online
    marcadores[device.id].setIcon(L.divIcon({
      className: '',
      html: `
        <div style="
          width:36px; height:36px;
          border-radius:50%;
          background:${device.color}22;
          border:2.5px solid ${device.color};
          display:flex; align-items:center;
          justify-content:center;
          font-size:16px;
          box-shadow:0 0 14px ${device.color};
        ">${device.emoji}</div>
      `,
      iconSize: [36,36], iconAnchor: [18,18],
    }));
  }

  if (device.id === idSeleccionado) {
    actualizarInfoPanel(device);
    cargarHistorial(device.id);
  }

  renderizarLista();
});

// ════════════════════════════════════════════
//  BUSCADOR Y RELOJ
// ════════════════════════════════════════════
document.getElementById('buscador').addEventListener('input', e => {
  renderizarLista(e.target.value);
});

setInterval(() => {
  document.getElementById('reloj').textContent = new Date().toLocaleTimeString();
}, 1000);

// ════════════════════════════════════════════
//  ARRANQUE — carga datos desde MySQL
// ════════════════════════════════════════════
cargarTrabajadores();


// ════════════════════════════════════════════
//  SIDEBAR TOGGLE — Móvil
// ════════════════════════════════════════════
const btnToggle      = document.getElementById('btnToggleSidebar');
const sidebar        = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

btnToggle.addEventListener('click', () => {
  const abierta = sidebar.classList.toggle('abierta');
  sidebarOverlay.classList.toggle('visible', abierta);
  btnToggle.textContent = abierta ? '✕' : '☰';
});

sidebarOverlay.addEventListener('click', () => {
  sidebar.classList.remove('abierta');
  sidebarOverlay.classList.remove('visible');
  btnToggle.textContent = '☰';
});

function cerrarSidebarMovil() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('abierta');
    sidebarOverlay.classList.remove('visible');
    btnToggle.textContent = '☰';
  }
}