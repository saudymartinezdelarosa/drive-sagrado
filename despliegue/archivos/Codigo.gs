/**
 * SIGESC · Código del servidor en un solo archivo (generado desde src/*.gs).
 * No editar aquí: editar src/ y volver a ejecutar despliegue/generar.sh.
 * Commit de origen: 2ba928a
 */

/* ======================================================================
 *  Config.gs
 * ====================================================================== */

/**
 * SIGESC · Sistema de Gestión Documental del Politécnico
 * Configuración general.
 *
 * Todo lo que aquí aparece es el punto de partida que se carga en la hoja
 * de metadatos durante setup(). Después, áreas y usuarios se administran
 * desde el portal (Administración), sin tocar el código.
 */

var CONFIG = {
  SISTEMA: 'SIGESC',
  SISTEMA_DESCRIPCION: 'Sistema de Gestión Documental',
  INSTITUCION: 'Politécnico',

  // URL pública del logo oficial (PNG o SVG). Puede ser la del sitio PWA
  // (p. ej. https://<usuario>.github.io/drive-sagrado/icons/logo.png).
  // También puede definirse como propiedad de script LOGO_URL.
  LOGO_URL: '',

  CARPETA_RAIZ: 'SIGESC · Gestión Documental',
  CARPETA_SISTEMA: '_Sistema',
  CARPETA_VERSIONES: '_Versiones',
  HOJA_INDICE: 'SIGESC · Índice de metadatos',

  // Clave genérica inicial (un dígito del 1 al 9). Se puede sobrescribir con
  // la propiedad de script CLAVE_INICIAL antes de ejecutar setup().
  CLAVE_INICIAL: '1',

  SESION_SEGUNDOS: 6 * 60 * 60,      // 6 h (máximo de CacheService)
  INTENTOS_MAXIMOS: 5,               // intentos fallidos antes de bloquear
  BLOQUEO_SEGUNDOS: 15 * 60,

  TAMANO_MAXIMO_MB: 25,
  REVISION_MESES: 12,                // próxima revisión por defecto
  AVISO_DIAS: [30, 15, 7, 1, 0],     // días antes del vencimiento en que se avisa
  HORA_AVISOS: 7,                    // hora del aviso diario

  ESTADOS: ['Vigente', 'En revisión', 'Obsoleto'],

  // Envíos a Calidad: cualquier área puede enviar sus informes y cronogramas al
  // Departamento de Calidad, aunque no tenga acceso a la carpeta de Calidad.
  AREA_CALIDAD: 'CAL',
  TIPOS_ENVIO: ['Informe', 'Cronograma', 'Plan de trabajo', 'Acta', 'Evidencia', 'Otro'],
  ESTADOS_ENVIO: ['Enviado', 'Recibido', 'Devuelto']
};

/**
 * Roles. Los permisos por rol se combinan con los permisos por área:
 *  - verTodo: puede ABRIR (solo lectura) las carpetas de todas las áreas.
 *  - editarTodo: puede subir/editar en todas las áreas.
 *  - cambiarEstado: puede pasar documentos a Vigente / En revisión / Obsoleto.
 *  - restaurar: puede restaurar versiones anteriores.
 *  - aprobarAccesos: puede aprobar solicitudes de acceso a sus áreas.
 *  - administrar: gestiona usuarios, áreas, auditoría.
 *  - nivel: alcance de visualización (mayor = más alcance), para ordenar.
 */
var ROLES = {
  ADMIN:        { nombre: 'Administración del sistema', nivel: 100, verTodo: true,  editarTodo: true,  cambiarEstado: true,  restaurar: true,  aprobarAccesos: true,  administrar: true,  verAuditoria: true },
  DIRECCION:    { nombre: 'Dirección',                  nivel: 80,  verTodo: true,  editarTodo: false, cambiarEstado: true,  restaurar: true,  aprobarAccesos: true,  administrar: false, verAuditoria: true },
  COORDINACION: { nombre: 'Coordinación',               nivel: 60,  verTodo: false, editarTodo: false, cambiarEstado: true,  restaurar: true,  aprobarAccesos: true,  administrar: false, verAuditoria: false },
  RESPONSABLE:  { nombre: 'Responsable de área',        nivel: 40,  verTodo: false, editarTodo: false, cambiarEstado: true,  restaurar: true,  aprobarAccesos: true,  administrar: false, verAuditoria: false },
  ASISTENTE:    { nombre: 'Asistente',                  nivel: 20,  verTodo: false, editarTodo: false, cambiarEstado: false, restaurar: false, aprobarAccesos: false, administrar: false, verAuditoria: false }
};

/**
 * Áreas iniciales. La lista queda abierta: se agregan más desde
 * Administración → Áreas. "grupo" agrupa áreas bajo un mismo paraguas
 * (p. ej. Orientación y Psicología) sin compartir permisos entre ellas.
 * Colores: tonos pastel tenues.
 */
var AREAS_INICIALES = [
  { id: 'DIR',  nombre: 'Dirección Académica',                             grupo: '',                         color: '#D9E1F2' },
  { id: 'COA',  nombre: 'Coordinación Académica',                          grupo: '',                         color: '#DCE9DF' },
  { id: 'CTP',  nombre: 'Coordinación de Asuntos Técnico-Profesionales',   grupo: '',                         color: '#F1E4CF' },
  { id: 'CAL',  nombre: 'Departamento de Calidad',                         grupo: '',                         color: '#EDE3C4' },
  { id: 'PAS',  nombre: 'Departamento de Pastoral',                        grupo: '',                         color: '#E8DCE9' },
  { id: 'REG',  nombre: 'Encargada de Registro',                           grupo: '',                         color: '#D8EAEB' },
  { id: 'SEC',  nombre: 'Secretaría Académica',                            grupo: '',                         color: '#F0DCDC' },
  { id: 'ASA',  nombre: 'Asistente Académica',                             grupo: '',                         color: '#E4E7D4' },
  { id: 'RRHH', nombre: 'Recursos Humanos',                                grupo: '',                         color: '#EFDFD3' },
  { id: 'VIN',  nombre: 'Vinculación Laboral',                             grupo: '',                         color: '#D8E5EF' },
  { id: 'OP1',  nombre: 'Orientación y Psicología · 1er Ciclo',            grupo: 'Orientación y Psicología', color: '#E0DBEE' },
  { id: 'OP2',  nombre: 'Orientación y Psicología · 2do Ciclo',            grupo: 'Orientación y Psicología', color: '#D6E9E0' }
];

/** Usuarios iniciales (usuario = nombre.apellido, sin tildes). */
var USUARIOS_INICIALES = [
  { nombre: 'Antonia',  apellido: 'Santana',          cargo: 'Directora Académica',                                 rol: 'DIRECCION',    areas: 'DIR' },
  { nombre: 'Mariela',  apellido: 'García',           cargo: 'Coordinadora Académica',                              rol: 'COORDINACION', areas: 'COA' },
  { nombre: 'Raisiry',  apellido: 'Campusano',        cargo: 'Coordinadora de Asuntos Técnico-Profesionales',      rol: 'COORDINACION', areas: 'CTP' },
  { nombre: 'Saudy',    apellido: 'Martínez',         cargo: 'Encargada del Departamento de Calidad',               rol: 'ADMIN',        areas: 'CAL' },
  { nombre: 'Evelyn',   apellido: 'Romero',           cargo: 'Encargada de Registro',                               rol: 'RESPONSABLE',  areas: 'REG' },
  { nombre: 'Jenny',    apellido: 'Herrera',          cargo: 'Secretaria Académica',                                rol: 'RESPONSABLE',  areas: 'SEC' },
  { nombre: 'Luisana',  apellido: 'Cepeda',           cargo: 'Asistente Académica',                                 rol: 'ASISTENTE',    areas: 'ASA' },
  { nombre: 'Berkys',   apellido: 'Mendoza',          cargo: 'Encargada de Recursos Humanos',                       rol: 'RESPONSABLE',  areas: 'RRHH' },
  { nombre: 'Ana',      apellido: 'Mena',             cargo: 'Encargada de Vinculación Laboral',                    rol: 'RESPONSABLE',  areas: 'VIN' },
  { nombre: 'Kenia',    apellido: 'León',             cargo: 'Orientadora y Psicóloga · 1er Ciclo',                 rol: 'RESPONSABLE',  areas: 'OP1' },
  { nombre: 'Krismari', apellido: 'Mejía de la Cruz', cargo: 'Orientadora y Psicóloga · 2do Ciclo',                 rol: 'RESPONSABLE',  areas: 'OP2' }
];

/** Estructura de la hoja índice (una pestaña por tabla). */
var TABLAS = {
  Usuarios:       ['usuario', 'nombre', 'apellido', 'cargo', 'email', 'rol', 'areas', 'hash', 'salt', 'debeCambiar', 'activo', 'notificarEmail', 'creado', 'ultimoAcceso'],
  Areas:          ['id', 'nombre', 'grupo', 'color', 'responsable', 'folderId', 'versionesId', 'orden', 'activa', 'creado'],
  Accesos:        ['id', 'usuario', 'areaId', 'nivel', 'otorgadoPor', 'fecha'],
  Solicitudes:    ['id', 'usuario', 'areaId', 'motivo', 'estado', 'nivel', 'fecha', 'resueltoPor', 'fechaResolucion'],
  Carpetas:       ['id', 'areaId', 'padreId', 'nombre', 'creadoPor', 'fecha'],
  Documentos:     ['id', 'sigesc', 'nombre', 'descripcion', 'etiquetas', 'areaId', 'carpetaId', 'fileId', 'archivo', 'mimeType', 'tamano', 'version', 'estado', 'responsable', 'creado', 'modificado', 'modificadoPor', 'fechaRevision'],
  Versiones:      ['docId', 'version', 'fileId', 'archivo', 'mimeType', 'tamano', 'usuario', 'fecha', 'nota'],
  Auditoria:      ['fecha', 'usuario', 'accion', 'areaId', 'docId', 'sigesc', 'detalle'],
  Notificaciones: ['id', 'usuario', 'fecha', 'tipo', 'mensaje', 'areaId', 'docId', 'leida'],
  Uso:            ['fecha', 'usuario', 'segundos', 'sesiones'],
  Envios:         ['id', 'docId', 'areaId', 'sigesc', 'version', 'tipo', 'periodo', 'mensaje', 'usuario', 'fecha', 'estado', 'revisadoPor', 'fechaRevisado', 'comentario'],
  Contadores:     ['clave', 'valor']
};

/** Frases de bienvenida: una distinta cada día (rotación por día del año). */
var FRASES = [
  'La calidad no es un acto, es un hábito.',
  'Un documento bien guardado es una decisión bien sustentada.',
  'Lo que se documenta, se mejora.',
  'La excelencia está en los detalles que nadie ve, pero todos sienten.',
  'Orden en los registros, claridad en las decisiones.',
  'Cada evidencia cuenta la historia de nuestro compromiso.',
  'La mejora continua comienza con un pequeño paso hoy.',
  'Trabajar con método es trabajar con respeto por los demás.',
  'La transparencia construye confianza institucional.',
  'Un buen registro hoy evita un problema mañana.',
  'Educar con calidad es servir con excelencia.',
  'La disciplina documental es memoria institucional.',
  'Hacer bien las cosas desde el principio es la forma más sencilla de hacerlas.',
  'Planificar, hacer, verificar y actuar: así crecemos.',
  'La información correcta, en el lugar correcto, en el momento correcto.',
  'Nuestro trabajo de hoy es la referencia de mañana.',
  'La calidad se construye entre todos, un documento a la vez.',
  'Lo que no se mide, no se puede mejorar.',
  'La constancia transforma el esfuerzo en resultados.',
  'Servir con excelencia es nuestra mejor carta de presentación.',
  'Un archivo ordenado es una mente despejada.',
  'Cada proceso documentado es un aprendizaje compartido.',
  'La responsabilidad se demuestra en la evidencia.',
  'Mejorar es un compromiso diario, no un evento.',
  'La organización es la base de toda buena gestión.',
  'Que cada documento refleje el compromiso de nuestra institución.',
  'La trazabilidad es la garantía de nuestra palabra.',
  'Un equipo que comparte información es un equipo que avanza.',
  'Gracias por cuidar la memoria de nuestra institución.',
  'La calidad educativa empieza por la calidad de nuestra gestión.',
  'Hoy es un buen día para dejar todo en orden.'
];

/** Lee una propiedad de script con valor por defecto. */
function prop_(clave, porDefecto) {
  var v = PropertiesService.getScriptProperties().getProperty(clave);
  return (v === null || v === '') ? porDefecto : v;
}

function logoUrl_() {
  return prop_('LOGO_URL', CONFIG.LOGO_URL);
}

/* ======================================================================
 *  Main.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Admin.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Auditoria.gs
 * ====================================================================== */

/**
 * Registro de auditoría (append-only): quién hizo qué, sobre qué documento y
 * cuándo. Sirve también como historial de cambios de cada documento.
 */

var ACCIONES = {
  LOGIN: 'Ingreso', LOGOUT: 'Salida', LOGIN_FALLIDO: 'Intento fallido', CAMBIO_CLAVE: 'Cambio de clave',
  SUBIDA: 'Subida', NUEVA_VERSION: 'Nueva versión', EDICION: 'Edición de datos', ESTADO: 'Cambio de estado',
  RESTAURACION: 'Restauración', DESCARGA: 'Descarga', VISUALIZACION: 'Visualización',
  CARPETA: 'Carpeta', SOLICITUD: 'Solicitud de acceso', ACCESO: 'Acceso', ADMIN: 'Administración',
  ENVIO: 'Envío a Calidad', REVISION_ENVIO: 'Revisión de envío', IMPRESION: 'Impresión'
};

function registrarAuditoria_(usuario, accion, areaId, docId, sigesc, detalle) {
  try {
    var h = hoja_('Auditoria');
    var fila = [ahora_(), usuario, accion, areaId || '', docId || '', sigesc || '', detalle || ''];
    var n = h.getLastRow() + 1;
    var r = h.getRange(n, 1, 1, fila.length);
    r.setNumberFormat('@');
    r.setValues([fila]);
  } catch (e) {
    console.error('Auditoría: ' + e);
  }
}

function auditoriaPublica_(a) {
  return {
    fecha: a.fecha, usuario: a.usuario, nombre: nombreCompleto_(a.usuario),
    accion: a.accion, accionTexto: ACCIONES[a.accion] || a.accion,
    areaId: a.areaId, docId: a.docId, sigesc: a.sigesc, detalle: a.detalle
  };
}

/** Historial de cambios de un documento (quién y qué cambió). */
function historialDocumento_(docId) {
  return filas_('Auditoria')
    .filter(function (a) { return a.docId === docId; })
    .reverse()
    .map(auditoriaPublica_);
}

/** Consulta de auditoría para Calidad/Dirección. */
function apiAuditoria(token, filtros) {
  var u = sesion_(token);
  exigirPermiso_(u, 'verAuditoria', 'Solo Calidad y Dirección pueden consultar la auditoría.');
  filtros = filtros || {};
  var limite = Math.min(Number(filtros.limite) || 300, 2000);
  var texto = String(filtros.texto || '').toLowerCase();
  return ultimasFilas_('Auditoria', 5000)
    .filter(function (a) {
      if (filtros.usuario && a.usuario !== filtros.usuario) return false;
      if (filtros.accion && a.accion !== filtros.accion) return false;
      if (filtros.areaId && a.areaId !== filtros.areaId) return false;
      if (filtros.desde && a.fecha < filtros.desde) return false;
      if (texto && (a.detalle + ' ' + a.sigesc + ' ' + a.usuario).toLowerCase().indexOf(texto) < 0) return false;
      return true;
    })
    .slice(0, limite)
    .map(auditoriaPublica_);
}

/* ======================================================================
 *  Auth.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Carpetas.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Db.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Documentos.gs
 * ====================================================================== */

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
  if (requiereEdicion) exigirEdicion_(u, d.areaId);
  else if (!nivelEnArea_(u, d.areaId) && !(esCalidad_(u) && documentoEnviadoACalidad_(docId))) exigirLectura_(u, d.areaId);
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
    // Envío a Calidad en el mismo paso (informes, cronogramas…).
    if (datos.enviarCalidad && d.areaId !== CONFIG.AREA_CALIDAD) d._envio = registrarEnvio_(u, d, datos.enviarCalidad);
    return d;
  });
  var r = documentoPublico_(doc);
  r.enviadoACalidad = !!doc._envio;
  return r;
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
    envios: filtrar_('Envios', function (e) { return e.docId === docId; }).reverse().map(envioPublico_),
    tiposEnvio: CONFIG.TIPOS_ENVIO,
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

/* ---------- Impresión: cualquier documento se entrega como PDF ---------- */

var CONVERSION_GOOGLE = {
  docx: 'application/vnd.google-apps.document', doc: 'application/vnd.google-apps.document',
  odt: 'application/vnd.google-apps.document', rtf: 'application/vnd.google-apps.document',
  txt: 'application/vnd.google-apps.document', html: 'application/vnd.google-apps.document', htm: 'application/vnd.google-apps.document',
  xlsx: 'application/vnd.google-apps.spreadsheet', xls: 'application/vnd.google-apps.spreadsheet',
  ods: 'application/vnd.google-apps.spreadsheet', csv: 'application/vnd.google-apps.spreadsheet',
  pptx: 'application/vnd.google-apps.presentation', ppt: 'application/vnd.google-apps.presentation',
  odp: 'application/vnd.google-apps.presentation'
};
var EXTENSION_POR_MIME = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/msword': 'doc',
  'application/vnd.oasis.opendocument.text': 'odt', 'application/rtf': 'rtf', 'text/rtf': 'rtf', 'text/plain': 'txt', 'text/html': 'html',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx', 'application/vnd.ms-excel': 'xls',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods', 'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx', 'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.oasis.opendocument.presentation': 'odp'
};

/** Hoja de cálculo de Google → PDF horizontal y ajustado al ancho (cronogramas legibles). */
function pdfHojaCalculo_(id) {
  try {
    var url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=pdf&size=letter&portrait=false&fitw=true' +
      '&gridlines=true&printtitle=false&sheetnames=false&pagenum=CENTER&top_margin=0.4&bottom_margin=0.4&left_margin=0.4&right_margin=0.4';
    var resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) return resp.getBlob();
  } catch (e) {
    console.warn('Exportación horizontal: ' + e);
  }
  return DriveApp.getFileById(id).getAs('application/pdf');
}

/** Convierte un archivo de Drive a PDF para verlo o imprimirlo en el navegador. */
function pdfDeArchivo_(file, nombre) {
  var mime = file.getMimeType();
  if (mime === 'application/pdf') return file.getBlob();
  if (mime === 'application/vnd.google-apps.spreadsheet') return pdfHojaCalculo_(file.getId());
  if (/^application\/vnd\.google-apps\./.test(mime)) return file.getAs('application/pdf');
  if (/^image\//.test(mime)) return file.getBlob().getAs('application/pdf');

  var ext = (String(nombre || '').match(/\.([a-z0-9]+)$/i) || [])[1];
  ext = ext ? ext.toLowerCase() : EXTENSION_POR_MIME[mime];
  var destino = CONVERSION_GOOGLE[ext] || CONVERSION_GOOGLE[EXTENSION_POR_MIME[mime]];
  if (!destino) throw new Error('Este tipo de archivo no se puede imprimir desde el portal. Descárguelo y ábralo en su programa.');
  if (typeof Drive === 'undefined') {
    throw new Error('Falta activar el servicio avanzado «Drive API» en el proyecto de Apps Script para imprimir archivos de Word, Excel o PowerPoint.');
  }
  // Copia temporal convertida a formato de Google; se exporta a PDF y se envía a la papelera.
  var temporal = Drive.Files.create({ name: 'SIGESC-impresion-' + file.getId(), mimeType: destino }, file.getBlob());
  try {
    return destino === 'application/vnd.google-apps.spreadsheet'
      ? pdfHojaCalculo_(temporal.id)
      : DriveApp.getFileById(temporal.id).getAs('application/pdf');
  } finally {
    try { DriveApp.getFileById(temporal.id).setTrashed(true); } catch (e) {}
  }
}

/**
 * Entrega el documento (o una versión) como PDF, listo para ver o imprimir.
 * Sirve para Word, Excel, PowerPoint, PDF, imágenes y archivos de Google.
 */
function apiImprimir(token, docId, version, modo) {
  var u = sesion_(token);
  var d = obtenerDocumento_(u, docId, false);
  var fileId = d.fileId, nombre = d.archivo, v = Number(d.version);
  if (version && Number(version) !== Number(d.version)) {
    var ver = filtrar_('Versiones', function (x) { return x.docId === docId && Number(x.version) === Number(version); })[0];
    if (!ver) throw new Error('Versión no encontrada.');
    fileId = ver.fileId; nombre = ver.archivo; v = Number(version);
  }
  var pdf = pdfDeArchivo_(DriveApp.getFileById(fileId), nombre);
  var nombrePdf = d.sigesc + ' · ' + String(nombre).replace(/\.[^.]*$/, '') + '.pdf';
  registrarAuditoria_(u.usuario, modo === 'ver' ? 'VISUALIZACION' : 'IMPRESION', d.areaId, d.id, d.sigesc,
    (modo === 'ver' ? 'Visualizó (PDF) ' : 'Preparó para imprimir ') + 'v' + v + ' «' + nombre + '»');
  return { nombre: nombrePdf, mimeType: 'application/pdf', base64: Utilities.base64Encode(pdf.getBytes()) };
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

/* ======================================================================
 *  Envios.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Notificaciones.gs
 * ====================================================================== */

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

/* ======================================================================
 *  Panel.gs
 * ====================================================================== */

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
    esCalidad: esCalidad_(u),
    enviosPendientes: enviosPendientes_(u),
    tiposEnvio: CONFIG.TIPOS_ENVIO,
    areaCalidad: CONFIG.AREA_CALIDAD,
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

/* ======================================================================
 *  Permisos.gs
 * ====================================================================== */

/**
 * Permisos = rol (alcance general) + área (acceso granular).
 * Niveles por área: 'edicion' > 'lectura' > null (bloqueado).
 * Ejemplo: OP1 y OP2 comparten grupo pero NO comparten permisos.
 */

function nivelEnArea_(u, areaId) {
  if (!areaId) return null;
  if (u.permisos.editarTodo) return 'edicion';
  if (u.listaAreas.indexOf(areaId) >= 0) return 'edicion';
  var nivel = null;
  filas_('Accesos').forEach(function (a) {
    if (a.usuario === u.usuario && a.areaId === areaId) {
      if (a.nivel === 'edicion') nivel = 'edicion';
      else if (!nivel) nivel = 'lectura';
    }
  });
  if (nivel) return nivel;
  if (u.permisos.verTodo) return 'lectura';
  return null;
}

function exigirLectura_(u, areaId) {
  var n = nivelEnArea_(u, areaId);
  if (!n) throw new Error('No tiene acceso a esta área. Puede solicitarlo desde el mapa documental.');
  return n;
}

function exigirEdicion_(u, areaId) {
  var n = nivelEnArea_(u, areaId);
  if (n === 'edicion') return;
  if (!n) throw new Error('No tiene acceso a esta área. Puede solicitarlo desde el mapa documental.');
  throw new Error('Su acceso a esta área es de solo lectura.');
}

/** ¿Recibe los envíos dirigidos a Calidad? (Administración o miembros del área de Calidad). */
function esCalidad_(u) {
  return !!u.permisos.administrar || u.listaAreas.indexOf(CONFIG.AREA_CALIDAD) >= 0;
}

function exigirPermiso_(u, permiso, mensaje) {
  if (!u.permisos[permiso]) throw new Error(mensaje || 'Su rol no tiene permiso para esta acción.');
}

/** ¿Puede este usuario aprobar solicitudes de acceso al área? */
function puedeAprobar_(u, areaId) {
  if (u.permisos.administrar) return true;
  return u.permisos.aprobarAccesos && u.listaAreas.indexOf(areaId) >= 0;
}

/** Capacidades del usuario dentro de un área, para la interfaz. */
function capacidades_(u, areaId) {
  var n = nivelEnArea_(u, areaId);
  return {
    nivel: n,
    ver: !!n,
    subir: n === 'edicion',
    crearCarpeta: n === 'edicion',
    cambiarEstado: n === 'edicion' && !!u.permisos.cambiarEstado,
    restaurar: n === 'edicion' && !!u.permisos.restaurar,
    enviarCalidad: n === 'edicion' && areaId !== CONFIG.AREA_CALIDAD,
    aprobar: puedeAprobar_(u, areaId)
  };
}

/* ======================================================================
 *  Uso.gs
 * ====================================================================== */

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
