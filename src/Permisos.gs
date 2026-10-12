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
  if (nivelEnArea_(u, areaId) !== 'edicion') throw new Error('Su acceso a esta área es de solo lectura.');
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
    aprobar: puedeAprobar_(u, areaId)
  };
}
