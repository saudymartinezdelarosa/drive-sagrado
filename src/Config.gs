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
