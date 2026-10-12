/**
 * Notificaciones: dentro del portal (campana) y, si el usuario registró un
 * correo y lo autorizó, también por email (MailApp, desde la cuenta propietaria).
 */

function notificar_(usuario, tipo, mensaje, areaId, docId) {
  insertar_('Notificaciones', {
    id: uid_('N'), usuario: usuario, fecha: ahora_(), tipo: tipo,
    mensaje: mensaje, areaId: areaId || '', docId: docId || '', leida: 'NO'
  });
  var u = buscar_('Usuarios', 'usuario', usuario);
  if (u && u.email && u.notificarEmail === 'SI') {
    try {
      MailApp.sendEmail({
        to: u.email,
        subject: CONFIG.SISTEMA + ' · ' + tipo,
        htmlBody: '<div style="font-family:Georgia,serif;color:#10204A">' +
          '<p>Hola, ' + escaparHtml_(u.nombre) + ':</p><p>' + escaparHtml_(mensaje) + '</p>' +
          '<p style="color:#8a7a3a">— ' + CONFIG.SISTEMA + ' · ' + CONFIG.SISTEMA_DESCRIPCION + ', ' + CONFIG.INSTITUCION + '</p></div>',
        name: CONFIG.SISTEMA
      });
    } catch (e) {
      console.warn('No se pudo enviar correo a ' + usuario + ': ' + e);
    }
  }
}

function escaparHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Usuarios con acceso de edición directo a un área (miembros). */
function miembrosArea_(areaId) {
  var miembros = {};
  filas_('Usuarios').forEach(function (u) {
    if (u.activo !== 'SI') return;
    var areas = String(u.areas || '').split(',').map(function (s) { return s.trim(); });
    if (areas.indexOf(areaId) >= 0) miembros[u.usuario] = true;
  });
  filas_('Accesos').forEach(function (a) { if (a.areaId === areaId && a.nivel === 'edicion') miembros[a.usuario] = true; });
  return Object.keys(miembros);
}

function aprobadoresArea_(areaId) {
  return filas_('Usuarios').filter(function (u) {
    if (u.activo !== 'SI') return false;
    var r = ROLES[u.rol] || {};
    if (r.administrar) return true;
    return r.aprobarAccesos && String(u.areas || '').split(',').map(function (s) { return s.trim(); }).indexOf(areaId) >= 0;
  }).map(function (u) { return u.usuario; });
}

function apiNotificaciones(token) {
  var u = sesion_(token);
  return filtrar_('Notificaciones', function (n) { return n.usuario === u.usuario; })
    .reverse().slice(0, 50).map(limpio_);
}

function apiMarcarLeidas(token) {
  var u = sesion_(token);
  conBloqueo_(function () {
    filtrar_('Notificaciones', function (n) { return n.usuario === u.usuario && n.leida !== 'SI'; })
      .forEach(function (n) { actualizarFila_('Notificaciones', n, { leida: 'SI' }); });
  });
  return true;
}

/**
 * Disparador diario: avisa a cada responsable de los documentos cuya
 * revisión está por vencer (30, 15, 7, 1 y 0 días) o vencida (cada 7 días).
 */
function revisarVencimientos() {
  // Una sola vez por día, aunque se invoque de nuevo (p. ej. desde el navegador).
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('ULTIMO_AVISO') === hoyLocal_()) return;
  props.setProperty('ULTIMO_AVISO', hoyLocal_());
  var hoy = new Date(hoyLocal_() + 'T00:00:00');
  conBloqueo_(function () {
    filas_('Documentos').forEach(function (d) {
      if (d.estado === 'Obsoleto' || !d.fechaRevision) return;
      var dias = Math.round((new Date(d.fechaRevision.slice(0, 10) + 'T00:00:00') - hoy) / 86400000);
      var avisar = CONFIG.AVISO_DIAS.indexOf(dias) >= 0 || (dias < 0 && (-dias) % 7 === 0);
      if (!avisar) return;
      var msg = dias > 0
        ? 'La revisión del documento ' + d.sigesc + ' «' + d.nombre + '» vence en ' + dias + ' día(s) (' + d.fechaRevision.slice(0, 10) + ').'
        : dias === 0
          ? 'La revisión del documento ' + d.sigesc + ' «' + d.nombre + '» vence hoy.'
          : 'La revisión del documento ' + d.sigesc + ' «' + d.nombre + '» está vencida desde hace ' + (-dias) + ' día(s).';
      var destinatarios = {};
      if (d.responsable) destinatarios[d.responsable] = true;
      var area = buscar_('Areas', 'id', d.areaId);
      if (area && area.responsable) destinatarios[area.responsable] = true;
      Object.keys(destinatarios).forEach(function (usr) { notificar_(usr, 'Revisión documental', msg, d.areaId, d.id); });
    });
  });
}
