// ════════════════════════════════════════════
//  CLASE: Device
//  Representa un dispositivo (celular) en el mapa
//  Cada dispositivo tiene sus propios datos y
//  métodos para actualizarse
// ════════════════════════════════════════════

class Device {

  // El constructor se ejecuta al crear un Device
  // Recibe un objeto con los datos iniciales
  constructor(datos) {
    this.id      = datos.id;
    this.nombre  = datos.nombre;
    this.emoji   = datos.emoji;
    this.rol     = datos.rol;
    this.color   = datos.color;
    this.estado  = datos.estado;   // 'online', 'away', 'offline'
    this.bateria = datos.bateria;  // 0 a 100
    this.velocidad = datos.velocidad;
    this.lat     = datos.lat;
    this.lng     = datos.lng;
    this.historial = [];           // guarda las últimas posiciones (el rastro)
  }

  // ── Actualiza la posición del dispositivo ──
  // Se llamará cada vez que llegue una nueva coordenada
  actualizarPosicion(lat, lng) {
    // Guardamos la posición anterior en el historial
    this.historial.push({ lat: this.lat, lng: this.lng });

    // Mantenemos solo las últimas 20 posiciones
    if (this.historial.length > 20) {
      this.historial.shift(); // elimina el más viejo
    }

    // Actualizamos la posición actual
    this.lat = lat;
    this.lng = lng;
  }

  // ── Simula movimiento aleatorio ──
  // En producción real esto vendría del GPS del celular
  simularMovimiento() {
    if (this.estado === 'offline' || this.velocidad === 0) return;

    const movLat = (Math.random() - 0.5) * 0.0003 * this.velocidad;
    const movLng = (Math.random() - 0.5) * 0.0004 * this.velocidad;

    this.actualizarPosicion(
      this.lat + movLat,
      this.lng + movLng
    );
  }

  // ── Devuelve el estado formateado para mostrar ──
  obtenerEstadoTexto() {
    const estados = {
      online:  '● Activo',
      away:    '◐ Inactivo',
      offline: '○ Sin señal'
    };
    return estados[this.estado] || 'Desconocido';
  }

  // ── Devuelve el color del estado ──
  obtenerColorEstado() {
    const colores = {
      online:  '#7cff6b',
      away:    '#ffc832',
      offline: '#ff4d6d'
    };
    return colores[this.estado] || '#ffffff';
  }

  // ── Devuelve la velocidad en km/h ──
  obtenerVelocidadKmh() {
    return (this.velocidad * 4.2).toFixed(1) + ' km/h';
  }
}