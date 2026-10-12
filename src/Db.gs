/**
 * Capa de datos: la hoja de cálculo es el índice de metadatos.
 * Cada pestaña es una tabla (ver TABLAS en Config.gs). Todos los valores se
 * guardan como texto para que Sheets no reinterprete fechas ni códigos.
 */

var _ss = null;
var _cacheTablas = {};

function ss_() {
  if (_ss) return _ss;
  var id = prop_('HOJA_ID', '');
  if (!id) throw new Error('El sistema no está inicializado. Ejecute setup() desde el editor de Apps Script.');
  _ss = SpreadsheetApp.openById(id);
  return _ss;
}

function hoja_(nombre) {
  var h = ss_().getSheetByName(nombre);
  if (!h) {
    // Pestañas nuevas (p. ej. Envios) en una hoja creada con una versión anterior.
    if (!TABLAS[nombre]) throw new Error('Falta la pestaña "' + nombre + '" en la hoja índice.');
    h = ss_().insertSheet(nombre);
    var cols = TABLAS[nombre];
    h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold')
      .setBackground('#10204A').setFontColor('#FFFFFF');
    h.setFrozenRows(1);
  }
  return h;
}

function normalizar_(v) {
  if (v instanceof Date) return v.toISOString();
  return v === null || v === undefined ? '' : String(v);
}

/** Devuelve todas las filas como objetos. Incluye _fila (número de fila real). */
function filas_(tabla) {
  if (_cacheTablas[tabla]) return _cacheTablas[tabla];
  var h = hoja_(tabla);
  var cols = TABLAS[tabla];
  var ultima = h.getLastRow();
  var out = [];
  if (ultima > 1) {
    var datos = h.getRange(2, 1, ultima - 1, cols.length).getValues();
    for (var i = 0; i < datos.length; i++) {
      var o = { _fila: i + 2 };
      for (var c = 0; c < cols.length; c++) o[cols[c]] = normalizar_(datos[i][c]);
      out.push(o);
    }
  }
  _cacheTablas[tabla] = out;
  return out;
}

/** Últimas n filas (para tablas grandes como Auditoria). */
function ultimasFilas_(tabla, n) {
  var h = hoja_(tabla);
  var cols = TABLAS[tabla];
  var ultima = h.getLastRow();
  if (ultima < 2) return [];
  var desde = Math.max(2, ultima - n + 1);
  var datos = h.getRange(desde, 1, ultima - desde + 1, cols.length).getValues();
  var out = [];
  for (var i = datos.length - 1; i >= 0; i--) {
    var o = { _fila: desde + i };
    for (var c = 0; c < cols.length; c++) o[cols[c]] = normalizar_(datos[i][c]);
    out.push(o);
  }
  return out; // más reciente primero
}

function buscar_(tabla, campo, valor) {
  var f = filas_(tabla);
  for (var i = 0; i < f.length; i++) if (f[i][campo] === String(valor)) return f[i];
  return null;
}

function filtrar_(tabla, fn) {
  return filas_(tabla).filter(fn);
}

function insertar_(tabla, obj) {
  var cols = TABLAS[tabla];
  var fila = cols.map(function (c) { return normalizar_(obj[c]); });
  var h = hoja_(tabla);
  var n = h.getLastRow() + 1;
  var rango = h.getRange(n, 1, 1, cols.length);
  rango.setNumberFormat('@');
  rango.setValues([fila]);
  delete _cacheTablas[tabla];
  obj._fila = n;
  return obj;
}

/** Actualiza la fila cuyo campo clave coincide. Devuelve el objeto actualizado o null. */
function actualizar_(tabla, campo, valor, cambios) {
  var actual = buscar_(tabla, campo, valor);
  if (!actual) return null;
  return actualizarFila_(tabla, actual, cambios);
}

function actualizarFila_(tabla, actual, cambios) {
  var cols = TABLAS[tabla];
  Object.keys(cambios).forEach(function (k) { if (cols.indexOf(k) >= 0) actual[k] = normalizar_(cambios[k]); });
  var fila = cols.map(function (c) { return normalizar_(actual[c]); });
  var rango = hoja_(tabla).getRange(actual._fila, 1, 1, cols.length);
  rango.setNumberFormat('@');
  rango.setValues([fila]);
  delete _cacheTablas[tabla];
  return actual;
}

function eliminarFila_(tabla, actual) {
  hoja_(tabla).deleteRow(actual._fila);
  delete _cacheTablas[tabla];
}

/** Ejecuta fn con bloqueo de script (escrituras concurrentes). */
function conBloqueo_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    _cacheTablas = {};
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function ahora_() { return new Date().toISOString(); }

function hoyLocal_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function uid_(prefijo) {
  return (prefijo || '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

/** Pública: elimina campos internos antes de enviar al navegador. */
function limpio_(o) {
  var r = {};
  Object.keys(o).forEach(function (k) { if (k.charAt(0) !== '_' && k !== 'hash' && k !== 'salt') r[k] = o[k]; });
  return r;
}
