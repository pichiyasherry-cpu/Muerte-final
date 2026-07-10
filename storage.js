/* =========================================================================
   storage.js — Módulo VI: Web Storage
   Responsable de TODA la persistencia en localStorage (permanente) y
   sessionStorage (efímera, se borra al cerrar el navegador).
   Expone un único objeto global: window.Storage = { LS, SS }
   ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------------------------------------- constantes */
  const LS_KEYS = {
    USERS: 'swm_users',            // array de usuarios registrados
    PREFS: 'swm_preferences',      // preferencias visuales
    CRYPTO_HISTORY: 'swm_crypto_history' // historial de textos encriptados
  };

  const SS_KEYS = {
    SESSION: 'swm_session' // objeto con inicio, páginas vistas y acciones
  };

  /* ---------------------------------------------------------------------
     ACCESO SEGURO A localStorage / sessionStorage
     Algunos navegadores (configuraciones de privacidad estrictas, modo
     incógnito, o abrir el archivo con doble clic en ciertos navegadores)
     bloquean por completo el acceso a estas APIs y lanzan una excepción
     con solo NOMBRARLAS. Si eso pasara y no lo controláramos, el script
     entero se detendría y ni siquiera el menú de navegación respondería.
     Por eso probamos el acceso real y, si falla, usamos un reemplazo en
     memoria: la app sigue funcionando durante la sesión (aunque en ese
     caso no persista al recargar la página).
     ------------------------------------------------------------------- */
  function crearAlmacenSeguro(nombreGlobal) {
    try {
      const real = window[nombreGlobal];
      const pruebaKey = '__swm_probe__';
      real.setItem(pruebaKey, '1');
      real.removeItem(pruebaKey);
      return { store: real, esReal: true };
    } catch (e) {
      console.warn(`[storage.js] "${nombreGlobal}" no está disponible en este navegador (¿modo privado o permisos bloqueados?). Se usará memoria temporal para que la app no se detenga.`, e);
      const memoria = {};
      return {
        esReal: false,
        store: {
          getItem: (k) => (Object.prototype.hasOwnProperty.call(memoria, k) ? memoria[k] : null),
          setItem: (k, v) => { memoria[k] = String(v); },
          removeItem: (k) => { delete memoria[k]; },
          get length() { return Object.keys(memoria).length; }
        }
      };
    }
  }

  const almacenLocal = crearAlmacenSeguro('localStorage');
  const almacenSesion = crearAlmacenSeguro('sessionStorage');

  /* ------------------------------------------------------------- helpers */
  function readJSON(store, key, fallback) {
    try {
      const raw = store.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[storage.js] Error leyendo "${key}":`, e);
      return fallback;
    }
  }

  function writeJSON(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[storage.js] Error escribiendo "${key}":`, e);
      return false;
    }
  }

  /* ========================================================================
     LOCAL STORAGE — persistencia permanente
     ======================================================================== */
  const LS = {

    /* ---------- USUARIOS ---------- */
    getUsers() {
      return readJSON(almacenLocal.store, LS_KEYS.USERS, []);
    },

    /**
     * Agrega un nuevo usuario. Devuelve { ok, error }.
     * El objeto `user` ya debe traer la contraseña hasheada (seguridad.js).
     */
    addUser(user) {
      const users = LS.getUsers();
      if (users.some(u => u.usuario.toLowerCase() === user.usuario.toLowerCase())) {
        return { ok: false, error: 'Ya existe un usuario con ese nombre.' };
      }
      if (users.some(u => u.correo.toLowerCase() === user.correo.toLowerCase())) {
        return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
      }
      const now = new Date().toISOString();
      users.push({
        ...user,
        fechaRegistro: now,
        ultimoAcceso: null,
        accesos: 0
      });
      writeJSON(almacenLocal.store, LS_KEYS.USERS, users);
      return { ok: true };
    },

    editUser(usuario, updates) {
      const users = LS.getUsers();
      const idx = users.findIndex(u => u.usuario === usuario);
      if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };
      users[idx] = { ...users[idx], ...updates };
      writeJSON(almacenLocal.store, LS_KEYS.USERS, users);
      return { ok: true, user: users[idx] };
    },

    deleteUser(usuario) {
      const users = LS.getUsers().filter(u => u.usuario !== usuario);
      writeJSON(almacenLocal.store, LS_KEYS.USERS, users);
      return { ok: true };
    },

    searchUser(usuario) {
      return LS.getUsers().find(
        u => u.usuario.toLowerCase() === String(usuario).toLowerCase()
      ) || null;
    },

    /** Registra un acceso exitoso: incrementa contador y marca fecha. */
    registerAccess(usuario) {
      const users = LS.getUsers();
      const idx = users.findIndex(u => u.usuario === usuario);
      if (idx === -1) return null;
      users[idx].accesos = (users[idx].accesos || 0) + 1;
      users[idx].ultimoAcceso = new Date().toISOString();
      writeJSON(almacenLocal.store, LS_KEYS.USERS, users);
      return users[idx];
    },

    exportUsersJSON() {
      // Nunca exportamos el hash de contraseña en texto plano de más,
      // pero al ser un hash unidireccional (seguridad.js) es seguro incluirlo.
      const json = JSON.stringify(LS.getUsers(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'usuarios_secureweb.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return json;
    },

    /* ---------- PREFERENCIAS VISUALES ---------- */
    savePreferences(prefs) {
      writeJSON(almacenLocal.store, LS_KEYS.PREFS, prefs);
    },
    getPreferences() {
      return readJSON(almacenLocal.store, LS_KEYS.PREFS, { accent: 'gold', density: 'cómoda' });
    },

    /* ---------- HISTORIAL DE ENCRIPTACIÓN ---------- */
    addCryptoHistory(entry) {
      const hist = LS.getCryptoHistory();
      hist.unshift(entry); // más reciente primero
      writeJSON(almacenLocal.store, LS_KEYS.CRYPTO_HISTORY, hist.slice(0, 50));
    },
    getCryptoHistory() {
      return readJSON(almacenLocal.store, LS_KEYS.CRYPTO_HISTORY, []);
    },
    clearCryptoHistory() {
      almacenLocal.store.removeItem(LS_KEYS.CRYPTO_HISTORY);
    },
    countCryptoHistory() {
      return LS.getCryptoHistory().length;
    },

    /* ---------- utilitario genérico ---------- */
    countKeys() {
      return almacenLocal.store.length;
    }
  };

  /* ========================================================================
     SESSION STORAGE — datos efímeros de la sesión actual
     ======================================================================== */
  const SS = {

    /** Debe llamarse una sola vez al cargar la aplicación. */
    initSession() {
      let session = readJSON(almacenSesion.store, SS_KEYS.SESSION, null);
      if (!session) {
        session = {
          inicio: Date.now(),
          vistas: 0,
          acciones: []
        };
        writeJSON(almacenSesion.store, SS_KEYS.SESSION, session);
      }
      return session;
    },

    getSession() {
      return readJSON(almacenSesion.store, SS_KEYS.SESSION, { inicio: Date.now(), vistas: 0, acciones: [] });
    },

    saveSession(session) {
      writeJSON(almacenSesion.store, SS_KEYS.SESSION, session);
    },

    /** Cuenta una "vista" cada vez que el usuario navega a un módulo distinto. */
    registerPageView(moduleLabel) {
      const session = SS.getSession();
      session.vistas += 1;
      SS.saveSession(session);
      SS.logAction(`Navegó a "${moduleLabel}"`);
      return session.vistas;
    },

    /** Guarda una acción relevante realizada por el usuario durante la sesión. */
    logAction(text) {
      const session = SS.getSession();
      session.acciones.push({ text, ts: Date.now() });
      // limitamos a las últimas 200 para no saturar sessionStorage
      if (session.acciones.length > 200) session.acciones = session.acciones.slice(-200);
      SS.saveSession(session);
      return session.acciones;
    },

    getActions() {
      return SS.getSession().acciones;
    },

    getElapsedSeconds() {
      const session = SS.getSession();
      return Math.floor((Date.now() - session.inicio) / 1000);
    },

    countKeys() {
      return almacenSesion.store.length;
    }
  };

  window.Storage = { LS, SS };
})();
