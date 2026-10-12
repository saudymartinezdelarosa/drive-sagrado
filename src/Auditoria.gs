/**
 * Registro de auditoría (append-only): quién hizo qué, sobre qué documento y
 * cuándo. Sirve también como historial de cambios de cada documento.
 */

var ACCIONES = {
  LOGIN: 'Ingreso', LOGOUT: 'Salida', LOGIN_FALLIDO: 'Intento fallido', CAMBIO_CLAVE: 'Cambio de clave',
  SUBIDA: 'Subida', NUEVA_VERSION: 'Nueva versión', EDICION: 'Edición de datos', ESTADO: 'Cambio de estado',
  RESTAURACION: 'Restauración', DESCARGA: 'Descarga', VISUALIZACION: 'Visualización',
  CARPETA: 'Carpeta', SOLICITUD: 'Solicitud de acceso', ACCESO: 'Acceso', ADMIN: 'Administración',
  ENVIO: 'Envío a Calidad', REVISION_ENVIO: 'Revisión de envío', IMPRESION: 'Impresión'
};

function registrarAuditoria_(usuario, accion, areaId, docId, sigesc, detalle) {
  try {
    var h = hoja_('Auditoria');
    var fila = [ahora_(), usuario, accion, areaId || '', docId || '', sigesc || '', detalle || ''];
    var n = h.getLastRow() + 1;
    var r = h.getRange(n, 1, 1, fila.length);
    r.setNumberFormat('@');
    r.setValues([fila]);
  } catch (e) {
    console.error('Auditoría: ' + e);
  }
}

function auditoriaPublica_(a) {
  return {
    fecha: a.fecha, usuario: a.usuario, nombre: nombreCompleto_(a.usuario),
    accion: a.accion, accionTexto: ACCIONES[a.accion] || a.accion,
    areaId: a.areaId, docId: a.docId, sigesc: a.sigesc, detalle: a.detalle
  };
}

/** Historial de cambios de un documento (quién y qué cambió). */
function historialDocumento_(docId) {
  return filas_('Auditoria')
    .filter(function (a) { return a.docId === docId; })
    .reverse()
    .map(auditoriaPublica_);
}

/** Consulta de auditoría para Calidad/Dirección. */
function apiAuditoria(token, filtros) {
  var u = sesion_(token);
  exigirPermiso_(u, 'verAuditoria', 'Solo Calidad y Dirección pueden consultar la auditoría.');
  filtros = filtros || {};
  var limite = Math.min(Number(filtros.limite) || 300, 2000);
  var texto = String(filtros.texto || '').toLowerCase();
  return ultimasFilas_('Auditoria', 5000)
    .filter(function (a) {
      if (filtros.usuario && a.usuario !== filtros.usuario) return false;
      if (filtros.accion && a.accion !== filtros.accion) return false;
      if (filtros.areaId && a.areaId !== filtros.areaId) return false;
      if (filtros.desde && a.fecha < filtros.desde) return false;
      if (texto && (a.detalle + ' ' + a.sigesc + ' ' + a.usuario).toLowerCase().indexOf(texto) < 0) return false;
      return true;
    })
    .slice(0, limite)
    .map(auditoriaPublica_);
}
