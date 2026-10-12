/**
 * Panel de control, mapa documental y salud documental por área.
 */

function areaPublica_(a) {
  return {
    id: a.id, nombre: a.nombre, grupo: a.grupo, color: a.color || '#E5E7EB',
    responsable: a.responsable, responsableNombre: a.responsable ? nombreCompleto_(a.responsable) : 'Pendiente de asignar',
    folderId: a.folderId, orden: Number(a.orden || 0)
  };
}

function areasActivas_() {
  return filas_('Areas').filter(function (a) { return a.activa === 'SI'; })
    .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); });
}

/**
 * Salud documental: % de documentos no obsoletos que están Vigentes y con la
 * revisión al día. null si el área aún no tiene documentos.
 */
function saludArea_(docs) {
  var activos = docs.filter(function (d) { return d.estado !== 'Obsoleto'; });
  var r = { total: docs.length, activos: activos.length, vigentes: 0, enRevision: 0, obsoletos: docs.length - activos.length, vencidos: 0, porVencer: 0, alDia: 0, salud: null };
  activos.forEach(function (d) {
    var dias = diasHasta_(d.fechaRevision);
    if (d.estado === 'Vigente') r.vigentes++; else r.enRevision++;
    if (dias !== null && dias < 0) r.vencidos++;
    else if (dias !== null && dias <= 30) r.porVencer++;
    if (d.estado === 'Vigente' && (dias === null || dias >= 0)) r.alDia++;
  });
  if (activos.length) r.salud = Math.round(r.alDia / activos.length * 100);
  return r;
}

/** Mapa completo (transparencia): todas las áreas y sus carpetas, con indicación de acceso. */
function mapa_(u) {
  var docs = filas_('Documentos');
  var pendientes = filtrar_('Solicitudes', function (s) { return s.usuario === u.usuario && s.estado === 'Pendiente'; })
    .map(function (s) { return s.areaId; });
  return areasActivas_().map(function (a) {
    var o = areaPublica_(a);
    var propios = docs.filter(function (d) { return d.areaId === a.id; });
    o.indicadores = saludArea_(propios);
    o.carpetas = arbolArea_(a);
    o.nivel = nivelEnArea_(u, a.id);
    o.solicitudPendiente = pendientes.indexOf(a.id) >= 0;
    return o;
  });
}

function apiMapa(token) {
  return mapa_(sesion_(token));
}

function panel_(u) {
  var docs = filas_('Documentos');
  var accesibles = docs.filter(function (d) { return !!nivelEnArea_(u, d.areaId); });
  var global = saludArea_(docs);
  var proximas = accesibles
    .filter(function (d) { return d.estado !== 'Obsoleto' && diasHasta_(d.fechaRevision) !== null && diasHasta_(d.fechaRevision) <= 30; })
    .sort(function (a, b) { return a.fechaRevision.localeCompare(b.fechaRevision); })
    .slice(0, 12).map(documentoPublico_);
  var enRevision = accesibles.filter(function (d) { return d.estado === 'En revisión'; }).slice(0, 12).map(documentoPublico_);
  var actividad = ultimasFilas_('Auditoria', 400)
    .filter(function (a) {
      if (['LOGIN', 'LOGOUT', 'LOGIN_FALLIDO', 'CAMBIO_CLAVE'].indexOf(a.accion) >= 0) return false;
      if (!a.areaId) return u.permisos.verAuditoria;
      return !!nivelEnArea_(u, a.areaId);
    })
    .slice(0, 15).map(auditoriaPublica_);
  return { global: global, proximas: proximas, enRevision: enRevision, actividad: actividad };
}

function apiPanel(token) {
  var u = sesion_(token);
  return { panel: panel_(u), mapa: mapa_(u) };
}

/** Todo lo necesario para pintar el portal al entrar. */
function apiInicio(token) {
  var u = sesion_(token);
  var notif = filtrar_('Notificaciones', function (n) { return n.usuario === u.usuario && n.leida !== 'SI'; }).length;
  var uso = filaUso_(u.usuario, hoyLocal_());
  var solicitudes = filtrar_('Solicitudes', function (s) { return s.estado === 'Pendiente' && puedeAprobar_(u, s.areaId); }).length;
  return {
    usuario: {
      usuario: u.usuario, nombre: u.nombre, apellido: u.apellido, cargo: u.cargo, email: u.email,
      notificarEmail: u.notificarEmail === 'SI',
      rol: u.rol, rolNombre: u.permisos.nombre, areas: u.listaAreas, debeCambiar: u.debeCambiar === 'SI',
      permisos: {
        administrar: !!u.permisos.administrar, verAuditoria: !!u.permisos.verAuditoria,
        aprobarAccesos: !!u.permisos.aprobarAccesos, verTodo: !!u.permisos.verTodo
      }
    },
    frase: fraseDelDia_(),
    hoy: hoyLocal_(),
    usoHoy: uso ? Number(uso.segundos || 0) : 0,
    notificacionesSinLeer: notif,
    solicitudesPendientes: solicitudes,
    panel: panel_(u),
    mapa: mapa_(u),
    estados: CONFIG.ESTADOS,
    tamanoMaximoMB: CONFIG.TAMANO_MAXIMO_MB,
    revisionMeses: CONFIG.REVISION_MESES
  };
}

function fraseDelDia_() {
  var hoy = new Date(hoyLocal_() + 'T00:00:00');
  var inicio = new Date(hoy.getFullYear(), 0, 1);
  var diaDelAnio = Math.floor((hoy - inicio) / 86400000);
  return FRASES[diaDelAnio % FRASES.length];
}

/** Preferencias personales: correo para notificaciones. */
function apiGuardarPreferencias(token, prefs) {
  var u = sesion_(token);
  var email = String(prefs.email || '').trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Correo no válido.');
  conBloqueo_(function () {
    actualizar_('Usuarios', 'usuario', u.usuario, { email: email, notificarEmail: prefs.notificarEmail && email ? 'SI' : 'NO' });
  });
  return true;
}
