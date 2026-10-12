/**
 * Documentos: subida, versiones, estados (ISO 9001), descarga y búsqueda.
 * El código SIGESC y el responsable los asigna el sistema automáticamente.
 */

/** Código SIGESC: SIGESC-<ÁREA>-<AÑO>-<consecutivo>. Ej.: SIGESC-CAL-2026-0007 */
function generarSigesc_(areaId) {
  var anio = hoyLocal_().slice(0, 4);
  var clave = areaId + '-' + anio;
  var c = buscar_('Contadores', 'clave', clave);
  var n = c ? Number(c.valor) + 1 : 1;
  if (c) actualizarFila_('Contadores', c, { valor: n });
  else insertar_('Contadores', { clave: clave, valor: n });
  return CONFIG.SISTEMA + '-' + areaId + '-' + anio + '-' + ('000' + n).slice(-4);
}

function documentoPublico_(d) {
  var o = limpio_(d);
  o.tamano = Number(d.tamano || 0);
  o.version = Number(d.version || 1);
  o.responsableNombre = nombreCompleto_(d.responsable);
  o.diasRevision = diasHasta_(d.fechaRevision);
  return o;
}

function diasHasta_(fechaIso) {
  if (!fechaIso) return null;
  var hoy = new Date(hoyLocal_() + 'T00:00:00');
  return Math.round((new Date(String(fechaIso).slice(0, 10) + 'T00:00:00') - hoy) / 86400000);
}

function fechaRevisionPorDefecto_() {
  var d = new Date();
  d.setMonth(d.getMonth() + CONFIG.REVISION_MESES);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function validarFecha_(f) {
  f = String(f || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return fechaRevisionPorDefecto_();
  return f;
}

function blobDesdeCarga_(archivo) {
  if (!archivo || !archivo.base64) throw new Error('Seleccione un archivo.');
  var bytes = Utilities.base64Decode(archivo.base64);
  if (bytes.length > CONFIG.TAMANO_MAXIMO_MB * 1024 * 1024) {
    throw new Error('El archivo supera el límite de ' + CONFIG.TAMANO_MAXIMO_MB + ' MB.');
  }
  var nombre = String(archivo.nombre || 'documento').replace(/[\\/]/g, '-');
  return Utilities.newBlob(bytes, archivo.mimeType || 'application/octet-stream', nombre);
}

function obtenerDocumento_(u, docId, requiereEdicion) {
  var d = buscar_('Documentos', 'id', docId);
  if (!d) throw new Error('Documento no encontrado.');
  if (requiereEdicion) exigirEdicion_(u, d.areaId); else exigirLectura_(u, d.areaId);
  return d;
}

/**
 * Sube un documento nuevo.
 * datos: {areaId, carpetaId, nombre, descripcion, etiquetas, estado, fechaRevision,
 *         archivo: {nombre, mimeType, base64}}
 */
function apiSubirDocumento(token, datos) {
  var u = sesion_(token);
  exigirEdicion_(u, datos.areaId);
  var blob = blobDesdeCarga_(datos.archivo);
  var estado = CONFIG.ESTADOS.indexOf(datos.estado) >= 0 ? datos.estado : 'Vigente';
  if (estado === 'Obsoleto') estado = 'Vigente';
  var nombre = String(datos.nombre || '').trim() || blob.getName().replace(/\.[^.]+$/, '');

  var doc = conBloqueo_(function () {
    var carpetaId = carpetaDeArea_(datos.areaId, datos.carpetaId);
    var sigesc = generarSigesc_(datos.areaId);
    blob.setName(sigesc + ' · ' + blob.getName());
    var file = DriveApp.getFolderById(carpetaId).createFile(blob);
    file.setDescription(sigesc + ' · ' + nombre);
    var ahora = ahora_();
    var d = insertar_('Documentos', {
      id: uid_('D'), sigesc: sigesc, nombre: nombre,
      descripcion: String(datos.descripcion || '').trim(),
      etiquetas: String(datos.etiquetas || '').trim(),
      areaId: datos.areaId, carpetaId: carpetaId, fileId: file.getId(),
      archivo: datos.archivo.nombre, mimeType: file.getMimeType(), tamano: file.getSize(),
      version: 1, estado: estado, responsable: u.usuario,
      creado: ahora, modificado: ahora, modificadoPor: u.usuario,
      fechaRevision: validarFecha_(datos.fechaRevision)
    });
    insertar_('Versiones', {
      docId: d.id, version: 1, fileId: file.getId(), archivo: datos.archivo.nombre,
      mimeType: file.getMimeType(), tamano: file.getSize(), usuario: u.usuario, fecha: ahora, nota: 'Versión inicial'
    });
    registrarAuditoria_(u.usuario, 'SUBIDA', d.areaId, d.id, sigesc, 'Subió «' + nombre + '» (v1, ' + estado + ')');
    var area = buscar_('Areas', 'id', d.areaId);
    miembrosArea_(d.areaId).forEach(function (m) {
      if (m !== u.usuario) {
        notificar_(m, 'Nuevo documento', u.nombre + ' ' + u.apellido + ' subió ' + sigesc + ' «' + nombre + '» en ' + area.nombre + '.', d.areaId, d.id);
      }
    });
    return d;
  });
  return documentoPublico_(doc);
}

/** Reemplaza el archivo vigente por uno nuevo; la versión anterior se conserva. */
function apiNuevaVersion(token, docId, archivo, nota) {
  var u = sesion_(token);
  var blob = blobDesdeCarga_(archivo);
  var d = conBloqueo_(function () {
    var d = obtenerDocumento_(u, docId, true);
    var area = buscar_('Areas', 'id', d.areaId);
    archivarArchivoActual_(d, area);
    var version = Number(d.version) + 1;
    blob.setName(d.sigesc + ' · ' + blob.getName());
    var file = DriveApp.getFolderById(d.carpetaId).createFile(blob);
    file.setDescription(d.sigesc + ' · ' + d.nombre + ' · v' + version);
    var ahora = ahora_();
    insertar_('Versiones', {
      docId: d.id, version: version, fileId: file.getId(), archivo: archivo.nombre,
      mimeType: file.getMimeType(), tamano: file.getSize(), usuario: u.usuario, fecha: ahora,
      nota: String(nota || '').trim()
    });
    var anterior = { archivo: d.archivo, tamano: d.tamano };
    actualizarFila_('Documentos', d, {
      fileId: file.getId(), archivo: archivo.nombre, mimeType: file.getMimeType(), tamano: file.getSize(),
      version: version, modificado: ahora, modificadoPor: u.usuario
    });
    registrarAuditoria_(u.usuario, 'NUEVA_VERSION', d.areaId, d.id, d.sigesc,
      'v' + (version - 1) + ' → v' + version + ': archivo «' + anterior.archivo + '» (' + formatoTamano_(anterior.tamano) + ') → «' +
      archivo.nombre + '» (' + formatoTamano_(file.getSize()) + ')' + (nota ? '. Nota: ' + nota : ''));
    return d;
  });
  return documentoPublico_(d);
}

/** Mueve el archivo vigente a la carpeta oculta de versiones del área. */
function archivarArchivoActual_(d, area) {
  try {
    var f = DriveApp.getFileById(d.fileId);
    f.moveTo(DriveApp.getFolderById(area.versionesId));
  } catch (e) {
    console.warn('No se pudo archivar el archivo ' + d.fileId + ': ' + e);
  }
}

function formatoTamano_(b) {
  b = Number(b || 0);
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

/** Restaura una versión anterior creando una versión nueva con ese contenido. */
function apiRestaurarVersion(token, docId, version, nota) {
  var u = sesion_(token);
  var d = conBloqueo_(function () {
    var d = obtenerDocumento_(u, docId, true);
    exigirPermiso_(u, 'restaurar', 'Su rol no permite restaurar versiones.');
    var v = filtrar_('Versiones', function (x) { return x.docId === docId && Number(x.version) === Number(version); })[0];
    if (!v) throw new Error('Versión no encontrada.');
    var area = buscar_('Areas', 'id', d.areaId);
    archivarArchivoActual_(d, area);
    var nueva = Number(d.version) + 1;
    var copia = DriveApp.getFileById(v.fileId).makeCopy(d.sigesc + ' · ' + v.archivo, DriveApp.getFolderById(d.carpetaId));
    copia.setDescription(d.sigesc + ' · ' + d.nombre + ' · v' + nueva + ' (restaurada de v' + version + ')');
    var ahora = ahora_();
    var textoNota = 'Restaurada desde v' + version + (nota ? '. ' + nota : '');
    insertar_('Versiones', {
      docId: d.id, version: nueva, fileId: copia.getId(), archivo: v.archivo,
      mimeType: copia.getMimeType(), tamano: copia.getSize(), usuario: u.usuario, fecha: ahora, nota: textoNota
    });
    actualizarFila_('Documentos', d, {
      fileId: copia.getId(), archivo: v.archivo, mimeType: copia.getMimeType(), tamano: copia.getSize(),
      version: nueva, modificado: ahora, modificadoPor: u.usuario
    });
    registrarAuditoria_(u.usuario, 'RESTAURACION', d.areaId, d.id, d.sigesc, 'v' + (nueva - 1) + ' → v' + nueva + ': ' + textoNota);
    return d;
  });
  return documentoPublico_(d);
}

/** Edita metadatos y registra qué cambió (antes → después). */
function apiEditarDocumento(token, docId, cambios) {
  var u = sesion_(token);
  var d = conBloqueo_(function () {
    var d = obtenerDocumento_(u, docId, true);
    var permitidos = ['nombre', 'descripcion', 'etiquetas', 'fechaRevision'];
    var etiquetas = { nombre: 'Nombre', descripcion: 'Descripción', etiquetas: 'Etiquetas', fechaRevision: 'Próxima revisión' };
    var aplicar = {};
    var detalle = [];
    permitidos.forEach(function (k) {
      if (cambios[k] === undefined) return;
      var nuevo = k === 'fechaRevision' ? validarFecha_(cambios[k]) : String(cambios[k]).trim();
      if (k === 'nombre' && !nuevo) return;
      if (nuevo !== d[k]) {
        detalle.push(etiquetas[k] + ': «' + (d[k] || '—') + '» → «' + (nuevo || '—') + '»');
        aplicar[k] = nuevo;
      }
    });
    if (!detalle.length) return d;
    aplicar.modificado = ahora_();
    aplicar.modificadoPor = u.usuario;
    actualizarFila_('Documentos', d, aplicar);
    if (aplicar.nombre) {
      try { DriveApp.getFileById(d.fileId).setDescription(d.sigesc + ' · ' + aplicar.nombre); } catch (e) {}
    }
    registrarAuditoria_(u.usuario, 'EDICION', d.areaId, d.id, d.sigesc, detalle.join(' | '));
    return d;
  });
  return documentoPublico_(d);
}

function apiCambiarEstado(token, docId, estado, nota) {
  var u = sesion_(token);
  if (CONFIG.ESTADOS.indexOf(estado) < 0) throw new Error('Estado no válido.');
  var d = conBloqueo_(function () {
    var d = obtenerDocumento_(u, docId, true);
    exigirPermiso_(u, 'cambiarEstado', 'Su rol no permite cambiar el estado de los documentos.');
    if (d.estado === estado) return d;
    var anterior = d.estado;
    var cambios = { estado: estado, modificado: ahora_(), modificadoPor: u.usuario };
    // Al volver a Vigente tras una revisión, se reprograma la próxima revisión.
    if (estado === 'Vigente' && anterior === 'En revisión') cambios.fechaRevision = fechaRevisionPorDefecto_();
    actualizarFila_('Documentos', d, cambios);
    registrarAuditoria_(u.usuario, 'ESTADO', d.areaId, d.id, d.sigesc,
      'Estado: «' + anterior + '» → «' + estado + '»' + (cambios.fechaRevision ? '. Próxima revisión: ' + cambios.fechaRevision : '') + (nota ? '. Nota: ' + nota : ''));
    if (d.responsable && d.responsable !== u.usuario) {
      notificar_(d.responsable, 'Cambio de estado', u.nombre + ' ' + u.apellido + ' cambió ' + d.sigesc + ' a «' + estado + '».', d.areaId, d.id);
    }
    return d;
  });
  return documentoPublico_(d);
}

/** Ficha completa: datos, versiones e historial de cambios. */
function apiObtenerDocumento(token, docId) {
  var u = sesion_(token);
  var d = obtenerDocumento_(u, docId, false);
  var area = buscar_('Areas', 'id', d.areaId);
  var versiones = filtrar_('Versiones', function (v) { return v.docId === docId; })
    .sort(function (a, b) { return Number(b.version) - Number(a.version); })
    .map(function (v) {
      var o = limpio_(v);
      o.version = Number(v.version);
      o.tamano = Number(v.tamano || 0);
      o.usuarioNombre = nombreCompleto_(v.usuario);
      delete o.fileId;
      return o;
    });
  return {
    documento: documentoPublico_(d),
    area: areaPublica_(area),
    ruta: rutaCarpeta_(area, d.carpetaId),
    versiones: versiones,
    historial: historialDocumento_(docId),
    capacidades: capacidades_(u, d.areaId)
  };
}

/**
 * Entrega el contenido del archivo (base64) para ver o descargar desde el portal.
 * El equipo no necesita acceso directo a Drive.
 */
function apiDescargar(token, docId, version, modo) {
  var u = sesion_(token);
  var d = obtenerDocumento_(u, docId, false);
  var fileId = d.fileId, nombre = d.archivo, v = Number(d.version);
  if (version && Number(version) !== Number(d.version)) {
    var ver = filtrar_('Versiones', function (x) { return x.docId === docId && Number(x.version) === Number(version); })[0];
    if (!ver) throw new Error('Versión no encontrada.');
    fileId = ver.fileId; nombre = ver.archivo; v = Number(version);
  }
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob(); // los archivos nativos de Google se exportan como PDF
  var mime = blob.getContentType();
  if (mime === 'application/pdf' && !/\.pdf$/i.test(nombre)) nombre = nombre.replace(/\.[^.]*$/, '') + '.pdf';
  registrarAuditoria_(u.usuario, modo === 'ver' ? 'VISUALIZACION' : 'DESCARGA', d.areaId, d.id, d.sigesc,
    (modo === 'ver' ? 'Visualizó' : 'Descargó') + ' v' + v + ' «' + nombre + '»');
  return { nombre: d.sigesc + ' · ' + nombre, mimeType: mime, base64: Utilities.base64Encode(blob.getBytes()) };
}

/**
 * Buscador: por código SIGESC, nombre, descripción, etiquetas y por el
 * CONTENIDO del archivo (índice de texto completo de Drive: PDF, Word, Docs…).
 * Solo devuelve documentos de áreas a las que el usuario tiene acceso.
 */
function apiBuscar(token, consulta, filtros) {
  var u = sesion_(token);
  filtros = filtros || {};
  var q = String(consulta || '').trim();
  var qn = quitarTildes_(q).toLowerCase();
  var docs = filas_('Documentos').filter(function (d) {
    if (filtros.areaId && d.areaId !== filtros.areaId) return false;
    if (filtros.estado && d.estado !== filtros.estado) return false;
    return !!nivelEnArea_(u, d.areaId);
  });
  if (!q) {
    return docs.sort(function (a, b) { return b.modificado.localeCompare(a.modificado); })
      .slice(0, 100).map(function (d) { var o = documentoPublico_(d); o.coincidencia = 'reciente'; return o; });
  }

  var resultados = {};
  var terminos = qn.split(/\s+/).filter(String);
  docs.forEach(function (d) {
    var codigo = d.sigesc.toLowerCase();
    var meta = quitarTildes_([d.nombre, d.descripcion, d.etiquetas, d.archivo, nombreCompleto_(d.responsable)].join(' ')).toLowerCase();
    var puntos = 0, motivo = '';
    if (codigo === qn) { puntos = 100; motivo = 'código'; }
    else if (codigo.indexOf(qn) >= 0) { puntos = 80; motivo = 'código'; }
    else if (terminos.every(function (t) { return meta.indexOf(t) >= 0; })) {
      puntos = quitarTildes_(d.nombre).toLowerCase().indexOf(qn) >= 0 ? 60 : 40;
      motivo = 'nombre o datos';
    }
    if (puntos) resultados[d.id] = { d: d, puntos: puntos, motivo: motivo };
  });

  // Contenido del documento: búsqueda de texto completo de Drive.
  try {
    var porArchivo = {};
    docs.forEach(function (d) { porArchivo[d.fileId] = d; });
    var expr = 'fullText contains "' + q.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '" and trashed = false';
    var it = DriveApp.searchFiles(expr);
    var n = 0;
    while (it.hasNext() && n++ < 300) {
      var f = it.next();
      var d = porArchivo[f.getId()];
      if (d && !resultados[d.id]) resultados[d.id] = { d: d, puntos: 30, motivo: 'contenido' };
    }
  } catch (e) {
    console.warn('Búsqueda de contenido: ' + e);
  }

  return Object.keys(resultados).map(function (k) { return resultados[k]; })
    .sort(function (a, b) { return b.puntos - a.puntos || b.d.modificado.localeCompare(a.d.modificado); })
    .slice(0, 100)
    .map(function (r) { var o = documentoPublico_(r.d); o.coincidencia = r.motivo; return o; });
}
