/**
 * Envíos a Calidad: cada área envía sus informes, cronogramas y demás
 * entregables al Departamento de Calidad sin necesitar acceso a la carpeta
 * de Calidad. El documento queda en la carpeta de su área (con su código
 * SIGESC y sus versiones); el envío es el registro de la entrega.
 * Calidad lo marca como Recibido o lo Devuelve con observaciones.
 */

/** Usuarios activos que reciben los envíos (Administración y miembros de Calidad). */
function receptoresCalidad_() {
  return filas_('Usuarios').filter(function (x) {
    if (x.activo !== 'SI') return false;
    var r = ROLES[x.rol] || {};
    if (r.administrar) return true;
    return String(x.areas || '').split(',').map(function (s) { return s.trim(); }).indexOf(CONFIG.AREA_CALIDAD) >= 0;
  }).map(function (x) { return x.usuario; });
}

/** ¿El documento fue enviado a Calidad? (Calidad puede abrirlo aunque no tenga acceso al área). */
function documentoEnviadoACalidad_(docId) {
  return filtrar_('Envios', function (e) { return e.docId === docId; }).length > 0;
}

/** Registra el envío y avisa a Calidad. Debe llamarse dentro de conBloqueo_. */
function registrarEnvio_(u, d, datos) {
  datos = datos || {};
  if (d.estado === 'Obsoleto') throw new Error('No se puede enviar un documento obsoleto.');
  if (d.areaId === CONFIG.AREA_CALIDAD) throw new Error('Este documento ya está en el Departamento de Calidad.');
  var tipo = CONFIG.TIPOS_ENVIO.indexOf(datos.tipo) >= 0 ? datos.tipo : 'Informe';
  var periodo = String(datos.periodo || '').trim().slice(0, 80);
  var mensaje = String(datos.mensaje || '').trim().slice(0, 500);
  var e = insertar_('Envios', {
    id: uid_('E'), docId: d.id, areaId: d.areaId, sigesc: d.sigesc, version: d.version,
    tipo: tipo, periodo: periodo, mensaje: mensaje, usuario: u.usuario, fecha: ahora_(),
    estado: 'Enviado', revisadoPor: '', fechaRevisado: '', comentario: ''
  });
  var area = buscar_('Areas', 'id', d.areaId);
  registrarAuditoria_(u.usuario, 'ENVIO', d.areaId, d.id, d.sigesc,
    'Envió a Calidad: ' + tipo + (periodo ? ' (' + periodo + ')' : '') + ' «' + d.nombre + '» v' + d.version + (mensaje ? '. Mensaje: ' + mensaje : ''));
  receptoresCalidad_().forEach(function (r) {
    if (r !== u.usuario) {
      notificar_(r, 'Envío a Calidad', u.nombre + ' ' + u.apellido + ' (' + (area ? area.nombre : d.areaId) + ') envió ' +
        tipo.toLowerCase() + (periodo ? ' de ' + periodo : '') + ': ' + d.sigesc + ' «' + d.nombre + '».', d.areaId, d.id);
    }
  });
  return e;
}

/** Envía a Calidad un documento ya guardado en el área. */
function apiEnviarACalidad(token, docId, datos) {
  var u = sesion_(token);
  var e = conBloqueo_(function () {
    var d = obtenerDocumento_(u, docId, true);
    return registrarEnvio_(u, d, datos);
  });
  return envioPublico_(e);
}

function envioPublico_(e) {
  var o = limpio_(e);
  var d = buscar_('Documentos', 'id', e.docId);
  var a = buscar_('Areas', 'id', e.areaId);
  o.version = Number(e.version || 1);
  o.documento = d ? d.nombre : '(documento no disponible)';
  o.versionActual = d ? Number(d.version || 1) : o.version;
  o.archivo = d ? d.archivo : '';
  o.areaNombre = a ? a.nombre : e.areaId;
  o.areaColor = a ? a.color : '#E5E7EB';
  o.nombre = nombreCompleto_(e.usuario);
  o.revisadoPorNombre = e.revisadoPor ? nombreCompleto_(e.revisadoPor) : '';
  return o;
}

/**
 * Bandeja de envíos. Calidad ve todos; las demás personas ven los envíos de
 * sus áreas (edición) y los que hicieron ellas mismas.
 */
function apiEnvios(token, filtros) {
  var u = sesion_(token);
  filtros = filtros || {};
  var calidad = esCalidad_(u);
  var lista = filas_('Envios').filter(function (e) {
    if (filtros.estado && e.estado !== filtros.estado) return false;
    if (filtros.areaId && e.areaId !== filtros.areaId) return false;
    if (filtros.tipo && e.tipo !== filtros.tipo) return false;
    if (calidad) return true;
    return e.usuario === u.usuario || nivelEnArea_(u, e.areaId) === 'edicion';
  });
  return {
    calidad: calidad,
    tipos: CONFIG.TIPOS_ENVIO,
    envios: lista.reverse().slice(0, 500).map(envioPublico_)
  };
}

/** Calidad marca un envío como Recibido o lo Devuelve con observaciones. */
function apiResolverEnvio(token, id, estado, comentario) {
  var u = sesion_(token);
  if (!esCalidad_(u)) throw new Error('Solo el Departamento de Calidad puede revisar los envíos.');
  if (['Recibido', 'Devuelto'].indexOf(estado) < 0) throw new Error('Estado no válido.');
  comentario = String(comentario || '').trim().slice(0, 500);
  if (estado === 'Devuelto' && !comentario) throw new Error('Escriba las observaciones para devolver el envío.');
  return conBloqueo_(function () {
    var e = buscar_('Envios', 'id', id);
    if (!e) throw new Error('Envío no encontrado.');
    var anterior = e.estado;
    actualizarFila_('Envios', e, { estado: estado, revisadoPor: u.usuario, fechaRevisado: ahora_(), comentario: comentario });
    registrarAuditoria_(u.usuario, 'REVISION_ENVIO', e.areaId, e.docId, e.sigesc,
      'Envío «' + anterior + '» → «' + estado + '»' + (comentario ? '. Observaciones: ' + comentario : ''));
    var d = buscar_('Documentos', 'id', e.docId);
    var texto = estado === 'Recibido'
      ? 'Calidad recibió su ' + e.tipo.toLowerCase() + ' ' + e.sigesc + (d ? ' «' + d.nombre + '»' : '') + '.'
      : 'Calidad devolvió su ' + e.tipo.toLowerCase() + ' ' + e.sigesc + (d ? ' «' + d.nombre + '»' : '') + ' con observaciones: ' + comentario;
    if (e.usuario !== u.usuario) notificar_(e.usuario, 'Envío a Calidad', texto, e.areaId, e.docId);
    return envioPublico_(e);
  });
}

function enviosPendientes_(u) {
  if (!esCalidad_(u)) return 0;
  return filtrar_('Envios', function (e) { return e.estado === 'Enviado'; }).length;
}
