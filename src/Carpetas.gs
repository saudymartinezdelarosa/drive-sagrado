/**
 * Carpetas: cada área tiene su carpeta raíz en Drive (propiedad de la cuenta
 * que ejecuta el script). Dentro, los miembros crean libremente sus propias
 * subcarpetas. Todos ven el mapa completo; solo entran a donde tienen acceso.
 */

function carpetaRaiz_() {
  return DriveApp.getFolderById(prop_('RAIZ_ID', ''));
}

function obtenerOCrearSubcarpeta_(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

/** Crea (si no existen) la carpeta del área y su carpeta oculta de versiones. */
function asegurarCarpetasArea_(area) {
  var cambios = {};
  if (!area.folderId) {
    var padre = carpetaRaiz_();
    if (area.grupo) padre = obtenerOCrearSubcarpeta_(padre, area.grupo);
    var f = obtenerOCrearSubcarpeta_(padre, area.nombre);
    cambios.folderId = f.getId();
  }
  if (!area.versionesId) {
    var sistema = obtenerOCrearSubcarpeta_(carpetaRaiz_(), CONFIG.CARPETA_SISTEMA);
    var versiones = obtenerOCrearSubcarpeta_(sistema, CONFIG.CARPETA_VERSIONES);
    cambios.versionesId = obtenerOCrearSubcarpeta_(versiones, area.id).getId();
  }
  if (Object.keys(cambios).length) actualizar_('Areas', 'id', area.id, cambios);
}

/** Verifica que la carpeta pertenece al área y devuelve su id de Drive. */
function carpetaDeArea_(areaId, carpetaId) {
  var area = buscar_('Areas', 'id', areaId);
  if (!area) throw new Error('Área no encontrada.');
  if (!carpetaId || carpetaId === area.folderId) return area.folderId;
  var c = buscar_('Carpetas', 'id', carpetaId);
  if (!c || c.areaId !== areaId) throw new Error('La carpeta no pertenece a esta área.');
  return c.id;
}

/** Ruta (migas de pan) desde la raíz del área hasta la carpeta. */
function rutaCarpeta_(area, carpetaId) {
  var ruta = [];
  var actual = carpetaId;
  var guardia = 0;
  while (actual && actual !== area.folderId && guardia++ < 30) {
    var c = buscar_('Carpetas', 'id', actual);
    if (!c) break;
    ruta.unshift({ id: c.id, nombre: c.nombre });
    actual = c.padreId;
  }
  ruta.unshift({ id: area.folderId, nombre: area.nombre });
  return ruta;
}

/** Árbol de nombres de subcarpetas de un área (para el mapa de transparencia). */
function arbolArea_(area) {
  var todas = filtrar_('Carpetas', function (c) { return c.areaId === area.id; });
  function hijos(padreId) {
    return todas.filter(function (c) { return c.padreId === padreId; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
      .map(function (c) { return { id: c.id, nombre: c.nombre, hijos: hijos(c.id) }; });
  }
  return hijos(area.folderId);
}

function apiCrearCarpeta(token, areaId, padreId, nombre) {
  var u = sesion_(token);
  exigirEdicion_(u, areaId);
  nombre = String(nombre || '').trim().replace(/[\\/]/g, '-');
  if (!nombre) throw new Error('Escriba un nombre para la carpeta.');
  if (nombre.length > 80) throw new Error('El nombre es demasiado largo.');
  return conBloqueo_(function () {
    var padreDrive = carpetaDeArea_(areaId, padreId);
    var repetida = filtrar_('Carpetas', function (c) { return c.padreId === padreDrive && c.nombre.toLowerCase() === nombre.toLowerCase(); });
    if (repetida.length) throw new Error('Ya existe una carpeta con ese nombre aquí.');
    var f = DriveApp.getFolderById(padreDrive).createFolder(nombre);
    var c = insertar_('Carpetas', { id: f.getId(), areaId: areaId, padreId: padreDrive, nombre: nombre, creadoPor: u.usuario, fecha: ahora_() });
    registrarAuditoria_(u.usuario, 'CARPETA', areaId, '', '', 'Creó la carpeta «' + nombre + '»');
    return limpio_(c);
  });
}

function apiRenombrarCarpeta(token, areaId, carpetaId, nombre) {
  var u = sesion_(token);
  exigirEdicion_(u, areaId);
  nombre = String(nombre || '').trim().replace(/[\\/]/g, '-');
  if (!nombre) throw new Error('Escriba un nombre para la carpeta.');
  return conBloqueo_(function () {
    var c = buscar_('Carpetas', 'id', carpetaId);
    if (!c || c.areaId !== areaId) throw new Error('Carpeta no encontrada.');
    var anterior = c.nombre;
    DriveApp.getFolderById(c.id).setName(nombre);
    actualizarFila_('Carpetas', c, { nombre: nombre });
    registrarAuditoria_(u.usuario, 'CARPETA', areaId, '', '', 'Renombró la carpeta «' + anterior + '» → «' + nombre + '»');
    return true;
  });
}

function apiEliminarCarpeta(token, areaId, carpetaId) {
  var u = sesion_(token);
  exigirEdicion_(u, areaId);
  return conBloqueo_(function () {
    var c = buscar_('Carpetas', 'id', carpetaId);
    if (!c || c.areaId !== areaId) throw new Error('Carpeta no encontrada.');
    var tieneHijas = filtrar_('Carpetas', function (x) { return x.padreId === c.id; }).length > 0;
    var tieneDocs = filtrar_('Documentos', function (d) { return d.carpetaId === c.id; }).length > 0;
    if (tieneHijas || tieneDocs) throw new Error('Solo se pueden eliminar carpetas vacías.');
    DriveApp.getFolderById(c.id).setTrashed(true);
    eliminarFila_('Carpetas', c);
    registrarAuditoria_(u.usuario, 'CARPETA', areaId, '', '', 'Eliminó la carpeta vacía «' + c.nombre + '»');
    return true;
  });
}

/** Contenido de una carpeta: subcarpetas + documentos. */
function apiAbrirCarpeta(token, areaId, carpetaId) {
  var u = sesion_(token);
  exigirLectura_(u, areaId);
  var area = buscar_('Areas', 'id', areaId);
  var actual = carpetaDeArea_(areaId, carpetaId);
  var sub = filtrar_('Carpetas', function (c) { return c.padreId === actual; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
    .map(function (c) {
      return {
        id: c.id, nombre: c.nombre,
        documentos: filtrar_('Documentos', function (d) { return d.carpetaId === c.id; }).length,
        subcarpetas: filtrar_('Carpetas', function (x) { return x.padreId === c.id; }).length
      };
    });
  var docs = filtrar_('Documentos', function (d) { return d.carpetaId === actual; })
    .sort(function (a, b) { return b.modificado.localeCompare(a.modificado); })
    .map(documentoPublico_);
  return {
    area: areaPublica_(area),
    carpetaId: actual,
    ruta: rutaCarpeta_(area, actual),
    subcarpetas: sub,
    documentos: docs,
    capacidades: capacidades_(u, areaId)
  };
}
