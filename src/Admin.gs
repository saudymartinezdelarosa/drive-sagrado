/**
 * Administración: usuarios, áreas (lista abierta), accesos y solicitudes.
 */

function exigirAdmin_(u) {
  exigirPermiso_(u, 'administrar', 'Solo la administración del sistema puede realizar esta acción.');
}

function usuarioPublico_(x) {
  var o = limpio_(x);
  o.rolNombre = (ROLES[x.rol] || {}).nombre || x.rol;
  return o;
}

function apiAdminDatos(token) {
  var u = sesion_(token);
  exigirAdmin_(u);
  return {
    usuarios: filas_('Usuarios').map(usuarioPublico_),
    areas: filas_('Areas').map(function (a) { var o = limpio_(a); o.orden = Number(a.orden || 0); return o; }),
    accesos: filas_('Accesos').map(function (a) { var o = limpio_(a); o.nombre = nombreCompleto_(a.usuario); return o; }),
    roles: Object.keys(ROLES).map(function (k) { return { id: k, nombre: ROLES[k].nombre, nivel: ROLES[k].nivel, permisos: ROLES[k] }; })
  };
}

/** Crea o edita un usuario. Al crear, recibe la clave genérica y debe cambiarla. */
function apiAdminGuardarUsuario(token, datos) {
  var u = sesion_(token);
  exigirAdmin_(u);
  if (!ROLES[datos.rol]) throw new Error('Rol no válido.');
  var areas = String(datos.areas || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  areas.forEach(function (id) { if (!buscar_('Areas', 'id', id)) throw new Error('Área desconocida: ' + id); });
  return conBloqueo_(function () {
    if (datos.usuario) {
      var existente = buscar_('Usuarios', 'usuario', datos.usuario);
      if (!existente) throw new Error('Usuario no encontrado.');
      if (existente.usuario === u.usuario && datos.activo === false) throw new Error('No puede desactivar su propio usuario.');
      var antes = existente.rol + ' / ' + existente.areas + ' / ' + existente.activo;
      actualizarFila_('Usuarios', existente, {
        nombre: datos.nombre, apellido: datos.apellido, cargo: datos.cargo, email: datos.email || '',
        rol: datos.rol, areas: areas.join(','), activo: datos.activo === false ? 'NO' : 'SI'
      });
      registrarAuditoria_(u.usuario, 'ADMIN', '', '', '', 'Editó usuario ' + existente.usuario + ' (' + antes + ' → ' + datos.rol + ' / ' + areas.join(',') + ' / ' + (datos.activo === false ? 'NO' : 'SI') + ')');
      return usuarioPublico_(existente);
    }
    var nuevo = crearUsuario_({
      nombre: datos.nombre, apellido: datos.apellido, cargo: datos.cargo, email: datos.email,
      rol: datos.rol, areas: areas.join(',')
    });
    registrarAuditoria_(u.usuario, 'ADMIN', '', '', '', 'Creó el usuario ' + nuevo.usuario + ' (' + datos.rol + ')');
    return usuarioPublico_(nuevo);
  });
}

function crearUsuario_(d) {
  var usuario = d.usuario || generarUsuario_(d.nombre, d.apellido);
  if (!d.nombre || !d.apellido) throw new Error('Nombre y apellido son obligatorios.');
  if (buscar_('Usuarios', 'usuario', usuario)) throw new Error('Ya existe el usuario ' + usuario + '.');
  var sal = nuevaSal_();
  return insertar_('Usuarios', {
    usuario: usuario, nombre: d.nombre, apellido: d.apellido, cargo: d.cargo || '', email: d.email || '',
    rol: d.rol, areas: d.areas || '', hash: hashClave_(prop_('CLAVE_INICIAL', CONFIG.CLAVE_INICIAL), sal), salt: sal,
    debeCambiar: 'SI', activo: 'SI', notificarEmail: d.email ? 'SI' : 'NO', creado: ahora_(), ultimoAcceso: ''
  });
}

function apiAdminRestablecerClave(token, usuario) {
  var u = sesion_(token);
  exigirAdmin_(u);
  conBloqueo_(function () {
    var sal = nuevaSal_();
    var r = actualizar_('Usuarios', 'usuario', usuario, {
      hash: hashClave_(prop_('CLAVE_INICIAL', CONFIG.CLAVE_INICIAL), sal), salt: sal, debeCambiar: 'SI'
    });
    if (!r) throw new Error('Usuario no encontrado.');
  });
  CacheService.getScriptCache().remove('fallos_' + usuario);
  registrarAuditoria_(u.usuario, 'ADMIN', '', '', '', 'Restableció la clave genérica de ' + usuario);
  return true;
}

/** Crea o edita un área. La lista de áreas queda abierta. */
function apiAdminGuardarArea(token, datos) {
  var u = sesion_(token);
  exigirAdmin_(u);
  var nombre = String(datos.nombre || '').trim();
  if (!nombre) throw new Error('El nombre del área es obligatorio.');
  var color = /^#[0-9a-fA-F]{6}$/.test(datos.color || '') ? datos.color : '#E5E7EB';
  if (datos.responsable && !buscar_('Usuarios', 'usuario', datos.responsable)) throw new Error('Responsable no encontrado.');
  return conBloqueo_(function () {
    var existente = datos.esNueva ? null : buscar_('Areas', 'id', datos.id);
    if (existente) {
      var antes = existente.nombre;
      actualizarFila_('Areas', existente, {
        nombre: nombre, grupo: String(datos.grupo || '').trim(), color: color,
        responsable: datos.responsable || '', orden: Number(datos.orden || existente.orden || 0), activa: datos.activa === false ? 'NO' : 'SI'
      });
      if (antes !== nombre && existente.folderId) {
        try { DriveApp.getFolderById(existente.folderId).setName(nombre); } catch (e) {}
      }
      asignarResponsable_(existente.id, datos.responsable);
      registrarAuditoria_(u.usuario, 'ADMIN', existente.id, '', '', 'Editó el área ' + existente.id + ' (' + nombre + ')');
      return limpio_(existente);
    }
    var id = String(datos.id || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!id || id.length > 6) throw new Error('El código del área debe tener entre 1 y 6 letras/números (se usa en el código SIGESC).');
    if (buscar_('Areas', 'id', id)) throw new Error('Ya existe un área con el código ' + id + '.');
    var area = insertar_('Areas', {
      id: id, nombre: nombre, grupo: String(datos.grupo || '').trim(), color: color,
      responsable: datos.responsable || '', folderId: '', versionesId: '',
      orden: Number(datos.orden || filas_('Areas').length + 1), activa: 'SI', creado: ahora_()
    });
    asegurarCarpetasArea_(area);
    asignarResponsable_(id, datos.responsable);
    registrarAuditoria_(u.usuario, 'ADMIN', id, '', '', 'Creó el área ' + id + ' (' + nombre + ')');
    return limpio_(buscar_('Areas', 'id', id));
  });
}

/** El responsable de un área siempre es miembro (edición) de esa área. */
function asignarResponsable_(areaId, usuario) {
  if (!usuario) return;
  var resp = buscar_('Usuarios', 'usuario', usuario);
  var lista = String(resp.areas || '').split(',').filter(String);
  if (lista.indexOf(areaId) < 0) { lista.push(areaId); actualizarFila_('Usuarios', resp, { areas: lista.join(',') }); }
}

/** Otorga acceso adicional (lectura o edición) a un usuario sobre un área. */
function otorgarAcceso_(otorgante, usuario, areaId, nivel) {
  nivel = nivel === 'edicion' ? 'edicion' : 'lectura';
  var previo = filtrar_('Accesos', function (a) { return a.usuario === usuario && a.areaId === areaId; })[0];
  if (previo) actualizarFila_('Accesos', previo, { nivel: nivel, otorgadoPor: otorgante, fecha: ahora_() });
  else insertar_('Accesos', { id: uid_('A'), usuario: usuario, areaId: areaId, nivel: nivel, otorgadoPor: otorgante, fecha: ahora_() });
  registrarAuditoria_(otorgante, 'ACCESO', areaId, '', '', 'Otorgó acceso de ' + nivel + ' a ' + usuario);
}

function apiAdminOtorgarAcceso(token, usuario, areaId, nivel) {
  var u = sesion_(token);
  exigirAdmin_(u);
  if (!buscar_('Usuarios', 'usuario', usuario) || !buscar_('Areas', 'id', areaId)) throw new Error('Usuario o área no válidos.');
  conBloqueo_(function () { otorgarAcceso_(u.usuario, usuario, areaId, nivel); });
  return true;
}

function apiAdminRevocarAcceso(token, accesoId) {
  var u = sesion_(token);
  exigirAdmin_(u);
  conBloqueo_(function () {
    var a = buscar_('Accesos', 'id', accesoId);
    if (!a) throw new Error('Acceso no encontrado.');
    eliminarFila_('Accesos', a);
    registrarAuditoria_(u.usuario, 'ACCESO', a.areaId, '', '', 'Revocó el acceso de ' + a.nivel + ' de ' + a.usuario);
  });
  return true;
}

/* ---------- Solicitudes de acceso (desde carpetas bloqueadas) ---------- */

function apiSolicitarAcceso(token, areaId, motivo) {
  var u = sesion_(token);
  var area = buscar_('Areas', 'id', areaId);
  if (!area) throw new Error('Área no encontrada.');
  if (nivelEnArea_(u, areaId)) throw new Error('Ya tiene acceso a esta área.');
  return conBloqueo_(function () {
    var previa = filtrar_('Solicitudes', function (s) { return s.usuario === u.usuario && s.areaId === areaId && s.estado === 'Pendiente'; })[0];
    if (previa) throw new Error('Ya tiene una solicitud pendiente para esta área.');
    insertar_('Solicitudes', {
      id: uid_('S'), usuario: u.usuario, areaId: areaId, motivo: String(motivo || '').trim().slice(0, 500),
      estado: 'Pendiente', nivel: 'lectura', fecha: ahora_(), resueltoPor: '', fechaResolucion: ''
    });
    registrarAuditoria_(u.usuario, 'SOLICITUD', areaId, '', '', 'Solicitó acceso a ' + area.nombre);
    aprobadoresArea_(areaId).forEach(function (ap) {
      notificar_(ap, 'Solicitud de acceso', u.nombre + ' ' + u.apellido + ' solicita acceso a ' + area.nombre + (motivo ? ': «' + motivo + '»' : '.'), areaId, '');
    });
    return true;
  });
}

function apiSolicitudes(token) {
  var u = sesion_(token);
  return filas_('Solicitudes')
    .filter(function (s) { return puedeAprobar_(u, s.areaId) || s.usuario === u.usuario; })
    .reverse().slice(0, 100)
    .map(function (s) {
      var o = limpio_(s);
      var a = buscar_('Areas', 'id', s.areaId);
      o.areaNombre = a ? a.nombre : s.areaId;
      o.nombre = nombreCompleto_(s.usuario);
      o.puedeResolver = s.estado === 'Pendiente' && puedeAprobar_(u, s.areaId);
      return o;
    });
}

function apiResolverSolicitud(token, id, aprobar, nivel) {
  var u = sesion_(token);
  return conBloqueo_(function () {
    var s = buscar_('Solicitudes', 'id', id);
    if (!s || s.estado !== 'Pendiente') throw new Error('Solicitud no disponible.');
    if (!puedeAprobar_(u, s.areaId)) throw new Error('No puede resolver solicitudes de esta área.');
    nivel = nivel === 'edicion' ? 'edicion' : 'lectura';
    actualizarFila_('Solicitudes', s, { estado: aprobar ? 'Aprobada' : 'Rechazada', nivel: nivel, resueltoPor: u.usuario, fechaResolucion: ahora_() });
    var area = buscar_('Areas', 'id', s.areaId);
    if (aprobar) otorgarAcceso_(u.usuario, s.usuario, s.areaId, nivel);
    else registrarAuditoria_(u.usuario, 'ACCESO', s.areaId, '', '', 'Rechazó la solicitud de ' + s.usuario);
    notificar_(s.usuario, 'Solicitud de acceso',
      aprobar ? 'Su solicitud de acceso a ' + area.nombre + ' fue aprobada (' + (nivel === 'edicion' ? 'edición' : 'lectura') + ').'
              : 'Su solicitud de acceso a ' + area.nombre + ' no fue aprobada.', s.areaId, '');
    return true;
  });
}
