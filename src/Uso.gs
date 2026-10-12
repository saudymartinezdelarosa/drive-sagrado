/**
 * Cronómetro de uso: el navegador cuenta los segundos con el portal visible y
 * los envía cada minuto. Aquí se acumulan por usuario y por día.
 */

var PULSO_MAXIMO = 120; // segundos aceptados por pulso (evita sumas infladas)

function filaUso_(usuario, fecha) {
  return filtrar_('Uso', function (r) { return r.usuario === usuario && r.fecha === fecha; })[0] || null;
}

function registrarSesionUso_(usuario) {
  var fecha = hoyLocal_();
  var r = filaUso_(usuario, fecha);
  if (r) actualizarFila_('Uso', r, { sesiones: Number(r.sesiones || 0) + 1 });
  else insertar_('Uso', { fecha: fecha, usuario: usuario, segundos: 0, sesiones: 1 });
}

/** Pulso del cronómetro. Devuelve el total acumulado de hoy. */
function apiPulso(token, segundos) {
  var u = sesion_(token);
  var s = Math.max(0, Math.min(PULSO_MAXIMO, Math.round(Number(segundos) || 0)));
  return conBloqueo_(function () {
    var fecha = hoyLocal_();
    var r = filaUso_(u.usuario, fecha);
    if (!r) r = insertar_('Uso', { fecha: fecha, usuario: u.usuario, segundos: 0, sesiones: 1 });
    var total = Number(r.segundos || 0) + s;
    if (s) actualizarFila_('Uso', r, { segundos: total });
    return { hoy: total };
  });
}

/**
 * Histórico de uso día por día. Cada usuario ve el suyo; Administración y
 * Dirección pueden ver el de cualquier usuario y el resumen del equipo.
 */
function apiHistorialUso(token, usuario, dias) {
  var u = sesion_(token);
  dias = Math.min(Number(dias) || 30, 366);
  var objetivo = usuario || u.usuario;
  var puedeVerOtros = u.permisos.verAuditoria;
  if (objetivo !== u.usuario && !puedeVerOtros) throw new Error('Solo puede consultar su propio tiempo de uso.');

  var tz = Session.getScriptTimeZone();
  var desdeFecha = new Date();
  desdeFecha.setDate(desdeFecha.getDate() - (dias - 1));
  var desde = Utilities.formatDate(desdeFecha, tz, 'yyyy-MM-dd');
  var todas = filas_('Uso');

  var porDia = {};
  var totalHistorico = 0;
  todas.forEach(function (r) {
    if (r.usuario !== objetivo) return;
    totalHistorico += Number(r.segundos || 0);
    if (r.fecha >= desde) porDia[r.fecha] = { segundos: Number(r.segundos || 0), sesiones: Number(r.sesiones || 0) };
  });
  var serie = [];
  for (var i = 0; i < dias; i++) {
    var f = new Date(desdeFecha.getTime());
    f.setDate(f.getDate() + i);
    var k = Utilities.formatDate(f, tz, 'yyyy-MM-dd');
    serie.push({ fecha: k, segundos: porDia[k] ? porDia[k].segundos : 0, sesiones: porDia[k] ? porDia[k].sesiones : 0 });
  }

  var equipo = null;
  if (puedeVerOtros) {
    var acumulado = {};
    todas.forEach(function (r) {
      if (r.fecha < desde) return;
      acumulado[r.usuario] = acumulado[r.usuario] || { segundos: 0, sesiones: 0, dias: 0 };
      acumulado[r.usuario].segundos += Number(r.segundos || 0);
      acumulado[r.usuario].sesiones += Number(r.sesiones || 0);
      if (Number(r.segundos || 0) > 0) acumulado[r.usuario].dias++;
    });
    equipo = filas_('Usuarios').filter(function (x) { return x.activo === 'SI'; }).map(function (x) {
      var a = acumulado[x.usuario] || { segundos: 0, sesiones: 0, dias: 0 };
      return { usuario: x.usuario, nombre: x.nombre + ' ' + x.apellido, segundos: a.segundos, sesiones: a.sesiones, dias: a.dias };
    }).sort(function (a, b) { return b.segundos - a.segundos; });
  }

  return {
    usuario: objetivo,
    nombre: nombreCompleto_(objetivo),
    serie: serie,
    totalPeriodo: serie.reduce(function (s, d) { return s + d.segundos; }, 0),
    totalHistorico: totalHistorico,
    equipo: equipo
  };
}
