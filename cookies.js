/* =========================================================================
   cookies.js — Módulo V: Gestión avanzada de cookies
   Provee lectura, escritura, edición y borrado de cookies del navegador,
   además de las cookies especiales de sesión de acceso (login).
   Expone: window.CookieManager
   ========================================================================= */

(function () {
  'use strict';

  const LOGIN_COOKIES = {
    USER: 'swm_user',
    LAST_ACCESS: 'swm_lastAccess',
    VISITS: 'swm_visits'
  };

  /* ------------------------------------------------------------ básicas */

  function setCookie(name, value, days = 7) {
    try {
      const encoded = encodeURIComponent(value);
      const maxAge = days * 24 * 60 * 60; // segundos
      document.cookie = `${name}=${encoded}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch (e) {
      console.warn('[cookies.js] No se pudo escribir la cookie (el navegador las está bloqueando):', e);
    }
  }

  function getCookie(name) {
    try {
      const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='));
      if (!match) return null;
      return decodeURIComponent(match.split('=').slice(1).join('='));
    } catch (e) {
      console.warn('[cookies.js] No se pudo leer la cookie:', e);
      return null;
    }
  }

  function deleteCookie(name) {
    try {
      document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
    } catch (e) {
      console.warn('[cookies.js] No se pudo eliminar la cookie:', e);
    }
  }

  function deleteAllCookies() {
    getAllCookies().forEach(c => deleteCookie(c.name));
  }

  /** Devuelve un array [{name, value}] con todas las cookies visibles. */
  function getAllCookies() {
    try {
      if (!document.cookie) return [];
      return document.cookie.split('; ').map(pair => {
        const idx = pair.indexOf('=');
        return {
          name: pair.substring(0, idx),
          value: decodeURIComponent(pair.substring(idx + 1))
        };
      });
    } catch (e) {
      console.warn('[cookies.js] No se pudieron leer las cookies:', e);
      return [];
    }
  }

  /* ---------------------------------------------------- login / acceso */

  /**
   * Se invoca tras una autenticación exitosa.
   * Crea/actualiza las cookies de usuario, último acceso y contador de visitas.
   * Devuelve un resumen para mostrar el mensaje de bienvenida.
   */
  function createLoginCookies(usuario) {
    const previousVisits = parseInt(getCookie(LOGIN_COOKIES.VISITS) || '0', 10);
    const previousLastAccess = getCookie(LOGIN_COOKIES.LAST_ACCESS);
    const newVisits = previousVisits + 1;
    const now = new Date();

    setCookie(LOGIN_COOKIES.USER, usuario, 30);
    setCookie(LOGIN_COOKIES.LAST_ACCESS, now.toISOString(), 30);
    setCookie(LOGIN_COOKIES.VISITS, String(newVisits), 30);

    return {
      usuario,
      esRecurrente: previousVisits > 0,
      ultimoAccesoAnterior: previousLastAccess,
      visitas: newVisits
    };
  }

  function getLoginState() {
    const usuario = getCookie(LOGIN_COOKIES.USER);
    if (!usuario) return null;
    return {
      usuario,
      ultimoAcceso: getCookie(LOGIN_COOKIES.LAST_ACCESS),
      visitas: parseInt(getCookie(LOGIN_COOKIES.VISITS) || '0', 10)
    };
  }

  function clearLoginCookies() {
    deleteCookie(LOGIN_COOKIES.USER);
    deleteCookie(LOGIN_COOKIES.LAST_ACCESS);
    deleteCookie(LOGIN_COOKIES.VISITS);
  }

  /* --------------------------------------------------------- UI: panel */

  function renderCookieList() {
    const list = document.getElementById('ckList');
    const counter = document.getElementById('ckCount');
    if (!list) return;

    const cookies = getAllCookies();
    counter.textContent = cookies.length;

    if (cookies.length === 0) {
      list.innerHTML = '<p class="text-faint small">No hay cookies activas.</p>';
      return;
    }

    list.innerHTML = cookies.map(c => `
      <div class="list-item" data-cookie="${c.name}">
        <div class="li-main">
          <span class="li-key">${escapeHtml(c.name)}</span>
          <span class="li-val">${escapeHtml(c.value)}</span>
        </div>
        <div class="li-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete">Eliminar</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.target.closest('.list-item').dataset.cookie;
        deleteCookie(name);
        if (window.Storage) window.Storage.SS.logAction(`Eliminó la cookie "${name}"`);
        renderCookieList();
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    });

    list.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const name = e.target.closest('.list-item').dataset.cookie;
        const current = getCookie(name);
        const nuevo = prompt(`Nuevo valor para "${name}":`, current);
        if (nuevo !== null) {
          setCookie(name, nuevo, 30);
          if (window.Storage) window.Storage.SS.logAction(`Modificó la cookie "${name}"`);
          renderCookieList();
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* --------------------------------------------------------------- init */

  function initCookiePanel() {
    const btnSave = document.getElementById('btnCkSave');
    const btnClearAll = document.getElementById('btnCkClearAll');

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const name = document.getElementById('ck-name').value.trim();
        const value = document.getElementById('ck-value').value.trim();
        const days = parseInt(document.getElementById('ck-days').value, 10) || 7;
        if (!name) { alert('Escribe un nombre de cookie.'); return; }
        setCookie(name, value, days);
        if (window.Storage) window.Storage.SS.logAction(`Creó/actualizó la cookie "${name}"`);
        document.getElementById('ck-name').value = '';
        document.getElementById('ck-value').value = '';
        renderCookieList();
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    }

    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        if (!confirm('¿Eliminar todas las cookies del sistema?')) return;
        deleteAllCookies();
        if (window.Storage) window.Storage.SS.logAction('Eliminó todas las cookies');
        renderCookieList();
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    }

    renderCookieList();
  }

  window.CookieManager = {
    setCookie,
    getCookie,
    deleteCookie,
    deleteAllCookies,
    getAllCookies,
    createLoginCookies,
    getLoginState,
    clearLoginCookies,
    renderCookieList,
    initCookiePanel
  };
})();
