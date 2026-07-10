/* =========================================================================
   dashboard.js
   Módulo VII — Panel administrativo (estadísticas + reporte dinámico)
   También actúa como controlador general de la interfaz: navegación entre
   módulos, pestañas, reloj en vivo, ticker de actividad y preferencias
   visuales (localStorage). Se carga al final para conectar todos los
   módulos anteriores (storage.js, cookies.js, seguridad.js, validaciones.js).
   ========================================================================= */

(function () {
  'use strict';

  /* =========================================================================
     1. NAVEGACIÓN ENTRE MÓDULOS (sidebar)
     ======================================================================= */

  function initNav() {
    const buttons = document.querySelectorAll('#mainNav button');
    const modules = document.querySelectorAll('.module');
    const topbarName = document.getElementById('topbarModuleName');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Paso crítico: SIEMPRE debe cambiar de sección, pase lo que pase después.
        const target = btn.dataset.target;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        modules.forEach(m => m.classList.toggle('active', m.id === target));

        // Todo lo demás (reloj, estadísticas, refrescos) es secundario:
        // si algo falla aquí, no debe impedir que la sección ya cambiada se vea.
        try {
          const etiqueta = btn.textContent.replace(/^\d+\s*/, '').trim();
          if (topbarName) topbarName.textContent = etiqueta;
          if (window.Storage) window.Storage.SS.registerPageView(etiqueta);
          updateSessionStats();

          if (target === 'mod-cookies' && window.CookieManager) window.CookieManager.renderCookieList();
          if (target === 'mod-storage') renderLocalStorageUsers();
          if (target === 'mod-dashboard') { refreshStats(); renderUserTable(); }
        } catch (e) {
          console.error('[dashboard.js] Error al refrescar datos del módulo (la navegación no se ve afectada):', e);
        }
      });
    });
  }

  function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const parent = btn.closest('.module');
        parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        parent.querySelectorAll('.tab-panel').forEach(p => {
          p.style.display = (p.id === btn.dataset.tab) ? 'block' : 'none';
        });
      });
    });
  }

  /* =========================================================================
     2. RELOJ EN VIVO + TICKER DE ACTIVIDAD (sessionStorage)
     ======================================================================= */

  function tickClock() {
    const clock = document.getElementById('liveClock');
    if (clock) clock.textContent = new Date().toLocaleTimeString('es-GT');
  }

  function tickFeed() {
    const feed = document.getElementById('tickFeed');
    if (!feed || !window.Storage) return;
    const acciones = window.Storage.SS.getActions();
    if (acciones.length === 0) return;
    const ultima = acciones[acciones.length - 1];
    const seg = window.Storage.SS.getElapsedSeconds();
    feed.textContent = `${ultima.text} · sesión activa hace ${seg}s`;
  }

  function updateSessionStats() {
    const ssTime = document.getElementById('ssTime');
    const ssPages = document.getElementById('ssPages');
    const ssActions = document.getElementById('ssActions');
    if (!window.Storage) return;
    if (ssTime) ssTime.textContent = window.Storage.SS.getElapsedSeconds() + 's';
    if (ssPages) ssPages.textContent = window.Storage.SS.getSession().vistas;
    if (ssActions) ssActions.textContent = window.Storage.SS.getActions().length;
  }

  /* =========================================================================
     3. PREFERENCIAS VISUALES (localStorage) — panel Web Storage
     ======================================================================= */

  const ACCENT_MAP = { gold: '#d4a94a', teal: '#3fc7b0', blue: '#5b8def', red: '#e5555c' };

  function aplicarPreferencias(prefs) {
    document.documentElement.style.setProperty('--gold', ACCENT_MAP[prefs.accent] || ACCENT_MAP.gold);
    document.body.dataset.density = prefs.density;
    const selAccent = document.getElementById('pref-accent');
    const selDensity = document.getElementById('pref-density');
    if (selAccent) selAccent.value = prefs.accent;
    if (selDensity) selDensity.value = prefs.density;
  }

  function initPreferences() {
    const btn = document.getElementById('btnSavePref');
    if (!btn) return;
    aplicarPreferencias(window.Storage.LS.getPreferences());

    btn.addEventListener('click', () => {
      const prefs = {
        accent: document.getElementById('pref-accent').value,
        density: document.getElementById('pref-density').value
      };
      window.Storage.LS.savePreferences(prefs);
      aplicarPreferencias(prefs);
      window.Storage.SS.logAction('Actualizó sus preferencias visuales');
    });
  }

  /* =========================================================================
     4. PANEL DE USUARIOS EN LOCALSTORAGE (Módulo VI)
     ======================================================================= */

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderLocalStorageUsers(filtro = '') {
    const list = document.getElementById('lsUserList');
    const counter = document.getElementById('lsUserCount');
    if (!list || !window.Storage) return;

    let users = window.Storage.LS.getUsers();
    counter.textContent = users.length;

    if (filtro) {
      users = users.filter(u => u.usuario.toLowerCase().includes(filtro.toLowerCase()));
    }

    if (users.length === 0) {
      list.innerHTML = '<p class="text-faint small">No hay usuarios que coincidan.</p>';
      return;
    }

    list.innerHTML = users.map(u => `
      <div class="list-item" data-user="${escapeHtml(u.usuario)}">
        <div class="li-main">
          <span class="li-key">${escapeHtml(u.usuario)}</span>
          <span class="li-val">${escapeHtml(u.correo)} · registrado ${new Date(u.fechaRegistro).toLocaleDateString('es-GT')}</span>
        </div>
        <div class="li-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit">Editar</button>
          <button class="btn btn-danger btn-sm" data-action="delete">Eliminar</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const usuario = e.target.closest('.list-item').dataset.user;
        if (!confirm(`¿Eliminar al usuario "${usuario}"?`)) return;
        window.Storage.LS.deleteUser(usuario);
        window.Storage.SS.logAction(`Eliminó al usuario "${usuario}" desde el panel`);
        renderLocalStorageUsers(document.getElementById('lsSearch').value);
        refreshStats();
        renderUserTable();
      });
    });

    list.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const usuario = e.target.closest('.list-item').dataset.user;
        const user = window.Storage.LS.searchUser(usuario);
        const nuevoCorreo = prompt(`Nuevo correo para "${usuario}":`, user.correo);
        if (nuevoCorreo === null) return;
        if (!window.Validaciones.validarCorreo(nuevoCorreo)) {
          alert('Correo inválido según las reglas del Módulo I.');
          return;
        }
        window.Storage.LS.editUser(usuario, { correo: nuevoCorreo.trim().toLowerCase() });
        window.Storage.SS.logAction(`Editó el correo de "${usuario}"`);
        renderLocalStorageUsers(document.getElementById('lsSearch').value);
      });
    });
  }

  function initStoragePanel() {
    const search = document.getElementById('lsSearch');
    const btnExport = document.getElementById('btnLsExport');
    if (search) {
      search.addEventListener('input', () => renderLocalStorageUsers(search.value));
    }
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.Storage.LS.exportUsersJSON();
        window.Storage.SS.logAction('Exportó los usuarios a JSON');
      });
    }
    renderLocalStorageUsers();
    initPreferences();
  }

  /* =========================================================================
     5. DASHBOARD / ESTADÍSTICAS GLOBALES (Módulo VII)
     ======================================================================= */

  function refreshStats() {
    if (!window.Storage) return;
    const users = window.Storage.LS.getUsers();
    const cookies = window.CookieManager ? window.CookieManager.getAllCookies() : [];
    const cryptoCount = window.Storage.LS.countCryptoHistory();

    setText('dashUsers', users.length);
    setText('dashCookies', cookies.length);
    setText('dashCrypto', cryptoCount);
    setText('dashLS', window.Storage.LS.countKeys());
    setText('dashSS', window.Storage.SS.countKeys());
    setText('dashActions', window.Storage.SS.getActions().length);

    setText('lsUserCount', users.length);
    setText('ckCount', cookies.length);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderUserTable() {
    const body = document.getElementById('dashTableBody');
    if (!body || !window.Storage) return;
    const users = window.Storage.LS.getUsers();

    if (users.length === 0) {
      body.innerHTML = '<tr class="empty-row"><td colspan="3">Sin usuarios registrados todavía.</td></tr>';
      return;
    }

    body.innerHTML = users.map(u => `
      <tr>
        <td class="mono-cell">${escapeHtml(u.usuario)}</td>
        <td>${new Date(u.fechaRegistro).toLocaleString('es-GT')}</td>
        <td>${u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-GT') : '—'}</td>
      </tr>
    `).join('');
  }

  function initDashboardPanel() {
    const btn = document.getElementById('btnRefreshDash');
    if (btn) btn.addEventListener('click', () => { refreshStats(); renderUserTable(); });
    refreshStats();
    renderUserTable();
  }

  /* =========================================================================
     6. ARRANQUE GENERAL DE LA APLICACIÓN
     ======================================================================= */

  /** Ejecuta una función de arranque sin dejar que un fallo tumbe toda la app. */
  function seguro(nombre, fn) {
    try {
      fn();
    } catch (e) {
      console.error(`[dashboard.js] Falló la inicialización de "${nombre}", pero la app sigue funcionando:`, e);
    }
  }

  function init() {
    // 1) Navegación y pestañas primero: SIEMPRE deben quedar activas,
    //    aunque cualquier otra cosa (almacenamiento, cookies, etc.) falle.
    seguro('navegación', initNav);
    seguro('pestañas', initTabs);
    seguro('reloj', () => { tickClock(); setInterval(tickClock, 1000); });

    // 2) Todo lo demás depende de storage.js / cookies.js / seguridad.js /
    //    validaciones.js — cada uno aislado para que un error puntual no
    //    detenga a los otros módulos.
    seguro('sesión', () => window.Storage.SS.initSession());
    seguro('registro', () => window.Validaciones.initRegistro());
    seguro('login', () => window.Validaciones.initLogin());
    seguro('motor de expresiones regulares', () => window.Validaciones.initRegexEngine());
    seguro('panel de encriptación', () => window.Security.initCryptoPanel());
    seguro('panel de cookies', () => window.CookieManager.initCookiePanel());
    seguro('panel de almacenamiento', initStoragePanel);
    seguro('panel de dashboard', initDashboardPanel);

    seguro('ticker de actividad', () => {
      setInterval(() => { tickFeed(); updateSessionStats(); }, 2000);
      updateSessionStats();
    });

    seguro('registro de inicio', () => window.Storage.SS.logAction('Aplicación iniciada'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Dashboard = { refreshStats, renderUserTable, renderLocalStorageUsers };
})();
