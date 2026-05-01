// ════════════════════════════════════════════
//  CLASE: MapRenderer
//  Se encarga de DIBUJAR el mapa en el canvas
//  Recibe la lista de dispositivos y los pinta
//  Principio: esta clase SOLO dibuja, no maneja datos
// ════════════════════════════════════════════

class MapRenderer {

  constructor(canvasId) {
    // Obtenemos el elemento canvas del HTML
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.zoom   = 1;

    // Centro del mapa (Ciudad de México)
    this.baseLat = 19.436;
    this.baseLng = -99.133;

    // Ajustamos el tamaño del canvas al contenedor
    this.ajustarTamanio();
    window.addEventListener('resize', () => this.ajustarTamanio());
  }

  // ── Ajusta el canvas al tamaño real de la pantalla ──
  ajustarTamanio() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  // ── Convierte coordenadas GPS a píxeles en pantalla ──
  // Esta es la función más importante del renderer
  coordsAPantalla(lat, lng) {
    const w     = this.canvas.width;
    const h     = this.canvas.height;
    const escala = this.zoom * Math.min(w, h) / 0.04;

    return {
      x: (w / 2) + (lng - this.baseLng) * escala * 1.1,
      y: (h / 2) - (lat - this.baseLat) * escala
    };
  }

  // ── Dibuja el fondo del mapa (calles y manzanas) ──
  dibujarFondo() {
    const ctx = this.ctx;
    const w   = this.canvas.width;
    const h   = this.canvas.height;

    // Fondo oscuro
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // Calles horizontales
    for (let i = -8; i <= 8; i++) {
      const lat = this.baseLat + i * 0.004;
      const p1  = this.coordsAPantalla(lat, this.baseLng - 0.06);
      const p2  = this.coordsAPantalla(lat, this.baseLng + 0.06);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = i % 3 === 0 ? '#111e33' : '#0d1a2e';
      ctx.lineWidth   = i % 3 === 0 ? 3 : 1.5;
      ctx.stroke();
    }

    // Calles verticales
    for (let i = -8; i <= 8; i++) {
      const lng = this.baseLng + i * 0.006;
      const p1  = this.coordsAPantalla(this.baseLat - 0.05, lng);
      const p2  = this.coordsAPantalla(this.baseLat + 0.05, lng);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = i % 3 === 0 ? '#111e33' : '#0d1a2e';
      ctx.lineWidth   = i % 3 === 0 ? 3 : 1.5;
      ctx.stroke();
    }

    // Manzanas (bloques de ciudad)
    for (let i = -7; i < 8; i++) {
      for (let j = -7; j < 8; j++) {
        const p1 = this.coordsAPantalla(
          this.baseLat + i * 0.004,
          this.baseLng + j * 0.006
        );
        const p2 = this.coordsAPantalla(
          this.baseLat + (i+1) * 0.004,
          this.baseLng + (j+1) * 0.006
        );
        ctx.fillStyle = 'rgba(15,28,52,0.5)';
        ctx.fillRect(
          Math.min(p1.x, p2.x) + 2,
          Math.min(p1.y, p2.y) + 2,
          Math.abs(p2.x - p1.x) - 4,
          Math.abs(p2.y - p1.y) - 4
        );
      }
    }
  }

  // ── Dibuja el rastro de movimiento de un dispositivo ──
  dibujarRastro(device) {
    if (device.historial.length < 2) return;
    const ctx = this.ctx;

    ctx.beginPath();
    device.historial.forEach((pos, i) => {
      const p = this.coordsAPantalla(pos.lat, pos.lng);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });

    ctx.strokeStyle = device.color + '50';
    ctx.lineWidth   = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]); // reset
  }

  // ── Dibuja el marcador de un dispositivo ──
  dibujarMarcador(device, estaSeleccionado) {
    const ctx = this.ctx;
    const p   = this.coordsAPantalla(device.lat, device.lng);
    const offline = device.estado === 'offline';

    // Anillo exterior (pulso si está seleccionado)
    if (estaSeleccionado && !offline) {
      const t = Date.now() / 600;
      const r = 18 + Math.sin(t) * 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = device.color + '50';
      ctx.lineWidth   = 2;
      ctx.stroke();
    }

    // Círculo exterior
    ctx.beginPath();
    ctx.arc(p.x, p.y, estaSeleccionado ? 13 : 10, 0, Math.PI * 2);
    ctx.fillStyle   = offline ? '#1a1a2e' : device.color + '25';
    ctx.strokeStyle = offline ? '#333'    : device.color;
    ctx.lineWidth   = estaSeleccionado ? 2.5 : 1.5;
    ctx.fill();
    ctx.stroke();

    // Punto central
    ctx.beginPath();
    ctx.arc(p.x, p.y, estaSeleccionado ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = offline ? '#333' : device.color;
    ctx.fill();

    // Nombre sobre el marcador
    if (estaSeleccionado) {
      ctx.font      = 'bold 11px Courier New';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(device.nombre.split(' ')[0], p.x, p.y - 20);
    }
  }

  // ── Método principal: dibuja todo el mapa ──
  dibujar(dispositivos, idSeleccionado) {
    this.ajustarTamanio();
    this.dibujarFondo();

    // Dibujamos cada dispositivo
    dispositivos.forEach(device => {
      this.dibujarRastro(device);
      this.dibujarMarcador(device, device.id === idSeleccionado);
    });
  }
}