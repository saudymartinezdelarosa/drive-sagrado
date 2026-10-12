/**
 * Punto de entrada de la aplicación web e instalación inicial.
 *
 * Instalación (una sola vez, con la cuenta propietaria):
 *   1. Ejecutar setup() desde el editor de Apps Script y autorizar permisos.
 *   2. Implementar → Nueva implementación → Aplicación web
 *      · Ejecutar como: Yo (cuenta propietaria)
 *      · Quién tiene acceso: Cualquier usuario
 *   El acceso real lo controla el login interno del portal.
 */

function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.cfg = JSON.stringify({
    sistema: CONFIG.SISTEMA,
    descripcion: CONFIG.SISTEMA_DESCRIPCION,
    institucion: CONFIG.INSTITUCION,
    logo: logoUrl_()
  });
  var salida = t.evaluate()
    .setTitle(CONFIG.SISTEMA + ' · ' + CONFIG.SISTEMA_DESCRIPCION)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // permite el contenedor PWA
  var logo = logoUrl_();
  if (logo && /\.png(\?|$)/i.test(logo)) {
    try { salida.setFaviconUrl(logo); } catch (err) {}
  }
  return salida;
}

function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

/**
 * Crea la carpeta raíz, la hoja índice, las carpetas de cada área, los
 * usuarios iniciales y el disparador diario de avisos. Es idempotente:
 * puede ejecutarse de nuevo sin duplicar nada.
 */
function setup() {
  exigirPropietario_();
  var props = PropertiesService.getScriptProperties();

  // 1. Carpeta raíz
  var raizId = props.getProperty('RAIZ_ID');
  var raiz = null;
  if (raizId) { try { raiz = DriveApp.getFolderById(raizId); } catch (e) { raiz = null; } }
  if (!raiz) {
    var it = DriveApp.getFoldersByName(CONFIG.CARPETA_RAIZ);
    raiz = it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.CARPETA_RAIZ);
    props.setProperty('RAIZ_ID', raiz.getId());
  }
  var sistema = obtenerOCrearSubcarpeta_(raiz, CONFIG.CARPETA_SISTEMA);

  // 2. Hoja índice de metadatos
  var hojaId = props.getProperty('HOJA_ID');
  var ss = null;
  if (hojaId) { try { ss = SpreadsheetApp.openById(hojaId); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.HOJA_INDICE);
    DriveApp.getFileById(ss.getId()).moveTo(sistema);
    props.setProperty('HOJA_ID', ss.getId());
  }
  _ss = ss;
  Object.keys(TABLAS).forEach(function (nombre) {
    var h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    var cols = TABLAS[nombre];
    h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold')
      .setBackground('#10204A').setFontColor('#FFFFFF');
    h.setFrozenRows(1);
    h.getRange(2, 1, Math.max(h.getMaxRows() - 1, 1), cols.length).setNumberFormat('@');
  });
  var porDefecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (porDefecto && ss.getSheets().length > 1) ss.deleteSheet(porDefecto);
  _cacheTablas = {};

  // 3. Clave inicial
  if (!props.getProperty('CLAVE_INICIAL')) props.setProperty('CLAVE_INICIAL', CONFIG.CLAVE_INICIAL);

  // 4. Áreas y usuarios iniciales
  conBloqueo_(function () {
    AREAS_INICIALES.forEach(function (a, i) {
      if (!buscar_('Areas', 'id', a.id)) {
        insertar_('Areas', {
          id: a.id, nombre: a.nombre, grupo: a.grupo, color: a.color, responsable: '',
          folderId: '', versionesId: '', orden: i + 1, activa: 'SI', creado: ahora_()
        });
      }
    });
    USUARIOS_INICIALES.forEach(function (d) {
      var usuario = generarUsuario_(d.nombre, d.apellido);
      if (!buscar_('Usuarios', 'usuario', usuario)) crearUsuario_(d);
      d.areas.split(',').forEach(function (areaId) {
        var area = buscar_('Areas', 'id', areaId);
        if (area && !area.responsable) actualizarFila_('Areas', area, { responsable: usuario });
      });
    });
    filas_('Areas').forEach(function (a) { asegurarCarpetasArea_(a); });
  });

  // 5. Disparador diario de revisiones
  instalarDisparadores();

  Logger.log('SIGESC listo.');
  Logger.log('Carpeta raíz: ' + raiz.getUrl());
  Logger.log('Hoja índice: ' + ss.getUrl());
  Logger.log('Clave inicial de todos los usuarios: ' + props.getProperty('CLAVE_INICIAL'));
  Logger.log('Usuarios: ' + filas_('Usuarios').map(function (u) { return u.usuario; }).join(', '));
}

function instalarDisparadores() {
  exigirPropietario_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'revisarVencimientos') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('revisarVencimientos').timeBased().everyDays(1).atHour(CONFIG.HORA_AVISOS).create();
}

/**
 * Toda función pública puede invocarse desde el navegador con google.script.run.
 * Las tareas de mantenimiento solo deben ejecutarse desde el editor por la
 * cuenta propietaria: en la aplicación web anónima getActiveUser() está vacío.
 */
function exigirPropietario_() {
  var activo = Session.getActiveUser().getEmail();
  if (!activo || activo !== Session.getEffectiveUser().getEmail()) {
    throw new Error('Esta función solo puede ejecutarse desde el editor de Apps Script por la cuenta propietaria.');
  }
}
