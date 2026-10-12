/**
 * Login interno (sin cuentas de Google). Usuario: nombre.apellido.
 * Las claves se guardan con sal y hash SHA-256 iterado; nunca en claro.
 * Las sesiones viven en CacheService (expiran tras 6 h de inactividad).
 */

function quitarTildes_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function generarUsuario_(nombre, apellido) {
  var n = quitarTildes_(nombre).trim().split(/\s+/)[0];
  var a = quitarTildes_(apellido).trim().split(/\s+/)[0];
  return (n + '.' + a).toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function hashClave_(clave, salt) {
  var d = salt + '|' + clave;
  for (var i = 0; i < 300; i++) {
    d = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, d + salt, Utilities.Charset.UTF_8));
  }
  return d;
}

function nuevaSal_() {
  return Utilities.getUuid() + Utilities.getUuid();
}

function validarClaveNueva_(clave) {
  clave = String(clave || '');
  if (clave.length < 6) throw new Error('La nueva clave debe tener al menos 6 caracteres.');
  if (clave === prop_('CLAVE_INICIAL', CONFIG.CLAVE_INICIAL)) throw new Error('La nueva clave no puede ser la clave genérica.');
  return clave;
}

function apiLogin(usuario, clave) {
  usuario = quitarTildes_(String(usuario || '')).trim().toLowerCase();
  clave = String(clave || '');
  var cache = CacheService.getScriptCache();
  var claveIntentos = 'fallos_' + usuario;
  var fallos = Number(cache.get(claveIntentos) || 0);
  if (fallos >= CONFIG.INTENTOS_MAXIMOS) {
    throw new Error('Demasiados intentos fallidos. Espere 15 minutos o contacte a Calidad.');
  }
  var u = buscar_('Usuarios', 'usuario', usuario);
  if (!u || u.activo !== 'SI' || hashClave_(clave, u.salt) !== u.hash) {
    cache.put(claveIntentos, String(fallos + 1), CONFIG.BLOQUEO_SEGUNDOS);
    registrarAuditoria_(usuario || '(vacío)', 'LOGIN_FALLIDO', '', '', '', 'Intento de acceso fallido');
    throw new Error('Usuario o clave incorrectos.');
  }
  cache.remove(claveIntentos);
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  cache.put('sesion_' + token, usuario, CONFIG.SESION_SEGUNDOS);
  conBloqueo_(function () {
    actualizar_('Usuarios', 'usuario', usuario, { ultimoAcceso: ahora_() });
    registrarSesionUso_(usuario);
  });
  registrarAuditoria_(usuario, 'LOGIN', '', '', '', 'Ingreso al portal');
  return { token: token, debeCambiar: u.debeCambiar === 'SI' };
}

function apiLogout(token) {
  var usuario = CacheService.getScriptCache().get('sesion_' + token);
  CacheService.getScriptCache().remove('sesion_' + token);
  if (usuario) registrarAuditoria_(usuario, 'LOGOUT', '', '', '', 'Salida del portal');
  return true;
}

/** Valida el token y devuelve el usuario completo. Renueva la sesión. */
function sesion_(token) {
  if (!token) throw new Error('SESION_EXPIRADA');
  var cache = CacheService.getScriptCache();
  var usuario = cache.get('sesion_' + token);
  if (!usuario) throw new Error('SESION_EXPIRADA');
  var u = buscar_('Usuarios', 'usuario', usuario);
  if (!u || u.activo !== 'SI') throw new Error('SESION_EXPIRADA');
  cache.put('sesion_' + token, usuario, CONFIG.SESION_SEGUNDOS);
  u.permisos = ROLES[u.rol] || ROLES.ASISTENTE;
  u.listaAreas = String(u.areas || '').split(',').map(function (s) { return s.trim(); }).filter(String);
  return u;
}

function apiCambiarClave(token, actual, nueva) {
  var u = sesion_(token);
  if (hashClave_(String(actual || ''), u.salt) !== u.hash) throw new Error('La clave actual no es correcta.');
  nueva = validarClaveNueva_(nueva);
  var sal = nuevaSal_();
  conBloqueo_(function () {
    actualizar_('Usuarios', 'usuario', u.usuario, { hash: hashClave_(nueva, sal), salt: sal, debeCambiar: 'NO' });
  });
  registrarAuditoria_(u.usuario, 'CAMBIO_CLAVE', '', '', '', 'Cambió su clave');
  return true;
}

function nombreCompleto_(usuario) {
  var u = buscar_('Usuarios', 'usuario', usuario);
  return u ? (u.nombre + ' ' + u.apellido) : usuario;
}
