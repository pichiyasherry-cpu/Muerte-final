/* =========================================================================
   validaciones.js
   Módulo I   — Registro inteligente de usuarios (expresiones regulares)
   Módulo II  — Analizador de seguridad de contraseñas
   Módulo III — Motor de expresiones regulares (RegExp, exec, test, replace)
   También controla el flujo de inicio de sesión del Módulo V (cookies).
   ========================================================================= */

(function () {
  'use strict';

  /* =========================================================================
     1. PATRONES DE VALIDACIÓN (Módulo I)
     ======================================================================= */

  const PATTERNS = {
    // Dos o más palabras, solo letras/acentos y espacios, longitud mínima 10.
    nombreCompleto: /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+(?:\s[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)+$/,
    // Dominios institucionales permitidos.
    correo: /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com|edu\.gt)$/,
    // Formato guatemalteco: 8 dígitos.
    telefono: /^[0-9]{8}$/,
    // 8-15 caracteres, inicia con letra, incluye al menos un número.
    usuario: /^(?=[A-Za-z0-9_]{8,15}$)[A-Za-z][A-Za-z0-9_]*\d[A-Za-z0-9_]*$/,
    // Min 10, mayúscula, minúscula, número y carácter especial.
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/
  };

  function validarNombre(v) {
    return PATTERNS.nombreCompleto.test(v.trim()) && v.trim().length >= 10;
  }
  function validarCorreo(v) {
    return PATTERNS.correo.test(v.trim().toLowerCase());
  }
  function validarTelefono(v) {
    return PATTERNS.telefono.test(v.trim());
  }
  function validarFechaNacimiento(v) {
    if (!v) return false;
    const fecha = new Date(v);
    if (isNaN(fecha.getTime())) return false;
    const hoy = new Date();
    if (fecha > hoy) return false;
    const edad = (hoy - fecha) / (1000 * 60 * 60 * 24 * 365.25);
    return edad >= 13;
  }
  function validarUsuario(v) {
    return PATTERNS.usuario.test(v.trim());
  }
  function validarPassword(v) {
    return PATTERNS.password.test(v);
  }

  /* =========================================================================
     2. ANALIZADOR DE FORTALEZA DE CONTRASEÑA (Módulo II)
     ======================================================================= */

  function evaluarFortaleza(password) {
    const criterios = {
      len: password.length >= 10,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      num: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    const puntos = Object.values(criterios).filter(Boolean).length;

    let nivel, color;
    if (password.length === 0) {
      nivel = 'Sin evaluar'; color = 'var(--text-faint)';
    } else if (puntos <= 2) {
      nivel = 'Débil'; color = 'var(--red)';
    } else if (puntos <= 4) {
      nivel = 'Media'; color = 'var(--gold)';
    } else {
      nivel = 'Fuerte'; color = 'var(--teal)';
    }
    const porcentaje = password.length === 0 ? 0 : Math.round((puntos / 5) * 100);
    return { criterios, puntos, nivel, color, porcentaje };
  }

  function pintarFortaleza(password) {
    const { criterios, nivel, color, porcentaje } = evaluarFortaleza(password);

    [['strengthFill', 'strengthLabel'], ['strengthFillBig', 'strengthLabelBig']].forEach(
      ([fillId, labelId]) => {
        const fill = document.getElementById(fillId);
        const label = document.getElementById(labelId);
        if (fill) { fill.style.width = porcentaje + '%'; fill.style.background = color; }
        if (label) { label.textContent = password.length ? `${nivel} (${porcentaje}%)` : 'Escribe una contraseña en el formulario para comenzar'; label.style.color = color; }
      }
    );

    const marks = {
      'crit-len': criterios.len, 'crit-upper': criterios.upper, 'crit-lower': criterios.lower,
      'crit-num': criterios.num, 'crit-special': criterios.special
    };
    Object.entries(marks).forEach(([id, ok]) => {
      const el = document.getElementById(id);
      if (el) el.style.color = ok ? 'var(--teal)' : 'var(--text-faint)';
    });
  }

  /* =========================================================================
     3. VALIDACIÓN EN VIVO + ENVÍO DEL FORMULARIO DE REGISTRO (Módulo I)
     ======================================================================= */

  function marcarCampo(fieldId, esValido) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.toggle('invalid', !esValido);
    field.classList.toggle('valid', esValido);
  }

  function showAlert(elId, type, message) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.className = `alert show alert-${type}`;
    el.textContent = message;
  }
  function hideAlert(elId) {
    const el = document.getElementById(elId);
    if (el) el.className = 'alert';
  }

  function initRegistro() {
    const nombre = document.getElementById('in-nombre');
    const correo = document.getElementById('in-correo');
    const telefono = document.getElementById('in-telefono');
    const nacimiento = document.getElementById('in-nacimiento');
    const usuario = document.getElementById('in-usuario');
    const password = document.getElementById('in-password');
    const password2 = document.getElementById('in-password2');
    const form = document.getElementById('formRegistro');

    if (!form) return;

    nombre.addEventListener('input', () => marcarCampo('f-nombre', validarNombre(nombre.value)));
    correo.addEventListener('input', () => marcarCampo('f-correo', validarCorreo(correo.value)));
    telefono.addEventListener('input', () => {
      telefono.value = telefono.value.replace(/[^0-9]/g, '').slice(0, 8);
      marcarCampo('f-telefono', validarTelefono(telefono.value));
    });
    nacimiento.addEventListener('change', () => marcarCampo('f-nacimiento', validarFechaNacimiento(nacimiento.value)));
    usuario.addEventListener('input', () => marcarCampo('f-usuario', validarUsuario(usuario.value)));
    password.addEventListener('input', () => {
      marcarCampo('f-password', validarPassword(password.value));
      pintarFortaleza(password.value);
      if (password2.value) marcarCampo('f-password2', password.value === password2.value);
    });
    password2.addEventListener('input', () => marcarCampo('f-password2', password.value === password2.value && password2.value.length > 0));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert('registroAlert');

      const valNombre = validarNombre(nombre.value);
      const valCorreo = validarCorreo(correo.value);
      const valTelefono = validarTelefono(telefono.value);
      const valNacimiento = validarFechaNacimiento(nacimiento.value);
      const valUsuario = validarUsuario(usuario.value);
      const valPassword = validarPassword(password.value);
      const valPassword2 = password.value === password2.value && password2.value.length > 0;

      marcarCampo('f-nombre', valNombre);
      marcarCampo('f-correo', valCorreo);
      marcarCampo('f-telefono', valTelefono);
      marcarCampo('f-nacimiento', valNacimiento);
      marcarCampo('f-usuario', valUsuario);
      marcarCampo('f-password', valPassword);
      marcarCampo('f-password2', valPassword2);

      const todoValido = valNombre && valCorreo && valTelefono && valNacimiento &&
        valUsuario && valPassword && valPassword2;

      if (!todoValido) {
        showAlert('registroAlert', 'err', 'Revisa los campos marcados en rojo antes de continuar.');
        return;
      }

      // Módulo IV + Desafío Extra: la contraseña NUNCA se guarda en texto plano.
      const { salt, hash } = window.Security.hashPassword(password.value);

      const resultado = window.Storage.LS.addUser({
        nombre: nombre.value.trim(),
        correo: correo.value.trim().toLowerCase(),
        telefono: telefono.value.trim(),
        nacimiento: nacimiento.value,
        usuario: usuario.value.trim(),
        passwordSalt: salt,
        passwordHash: hash
      });

      if (!resultado.ok) {
        showAlert('registroAlert', 'err', resultado.error);
        return;
      }

      showAlert('registroAlert', 'ok', `Usuario "${usuario.value.trim()}" registrado correctamente.`);
      window.Storage.SS.logAction(`Registró la cuenta "${usuario.value.trim()}"`);
      form.reset();
      pintarFortaleza('');
      ['f-nombre', 'f-correo', 'f-telefono', 'f-nacimiento', 'f-usuario', 'f-password', 'f-password2']
        .forEach(id => document.getElementById(id).classList.remove('valid', 'invalid'));

      if (window.Dashboard) window.Dashboard.refreshStats();
      if (window.Dashboard) window.Dashboard.renderUserTable();
    });

    pintarFortaleza('');
  }

  /* =========================================================================
     4. INICIO DE SESIÓN → dispara cookies del Módulo V
     ======================================================================= */

  function pintarBienvenida(usuario, cookieInfo) {
    const box = document.getElementById('welcomeBox');
    if (!box) return;
    const fecha = cookieInfo.ultimoAccesoAnterior
      ? new Date(cookieInfo.ultimoAccesoAnterior).toLocaleString('es-GT')
      : '—';
    box.innerHTML = `
      <div class="alert alert-ok show">Bienvenido nuevamente, <strong>${usuario}</strong>.</div>
      <table class="data-table">
        <tr><td>Último acceso</td><td class="mono-cell">${fecha}</td></tr>
        <tr><td>Número de visitas</td><td class="mono-cell">${cookieInfo.visitas}</td></tr>
      </table>
    `;
  }

  function actualizarSessionPill() {
    const estado = window.CookieManager.getLoginState();
    const pill = document.getElementById('sessionPill');
    const label = document.getElementById('sessionUserLabel');
    if (!pill || !label) return;
    if (estado) {
      pill.classList.add('online');
      label.textContent = `Sesión: ${estado.usuario}`;
    } else {
      pill.classList.remove('online');
      label.textContent = 'Sin sesión activa';
    }
  }

  function initLogin() {
    const form = document.getElementById('formLogin');
    const btnLogout = document.getElementById('btnLogout');
    if (!form) return;

    // Si ya existe una sesión (cookie) al cargar, mostramos la bienvenida.
    const estadoPrevio = window.CookieManager.getLoginState();
    if (estadoPrevio) {
      pintarBienvenida(estadoPrevio.usuario, {
        ultimoAccesoAnterior: estadoPrevio.ultimoAcceso,
        visitas: estadoPrevio.visitas
      });
    }
    actualizarSessionPill();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAlert('loginAlert');
      const usuarioVal = document.getElementById('li-usuario').value.trim();
      const passwordVal = document.getElementById('li-password').value;

      const user = window.Storage.LS.searchUser(usuarioVal);
      if (!user) {
        showAlert('loginAlert', 'err', 'Usuario no encontrado.');
        return;
      }
      const passOk = window.Security.verifyPassword(passwordVal, user.passwordSalt, user.passwordHash);
      if (!passOk) {
        showAlert('loginAlert', 'err', 'Contraseña incorrecta.');
        window.Storage.SS.logAction(`Intento de acceso fallido para "${usuarioVal}"`);
        return;
      }

      window.Storage.LS.registerAccess(user.usuario);
      const cookieInfo = window.CookieManager.createLoginCookies(user.usuario);
      pintarBienvenida(user.usuario, cookieInfo);
      actualizarSessionPill();
      showAlert('loginAlert', 'ok', 'Sesión iniciada correctamente.');
      window.Storage.SS.logAction(`Inició sesión como "${user.usuario}"`);
      window.CookieManager.renderCookieList();
      if (window.Dashboard) { window.Dashboard.refreshStats(); window.Dashboard.renderUserTable(); }
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        const estado = window.CookieManager.getLoginState();
        window.CookieManager.clearLoginCookies();
        actualizarSessionPill();
        document.getElementById('welcomeBox').innerHTML =
          '<p class="text-faint small">Sesión cerrada. Inicia sesión nuevamente para ver tus estadísticas de acceso.</p>';
        if (estado) window.Storage.SS.logAction(`Cerró sesión ("${estado.usuario}")`);
        window.CookieManager.renderCookieList();
      });
    }
  }

  /* =========================================================================
     5. MOTOR DE EXPRESIONES REGULARES (Módulo III)
     ======================================================================= */

  function parseFlags(raw) {
    // admite "g i m" o "gim"
    return raw.replace(/[^dgimsuy]/g, '');
  }

  function initRegexEngine() {
    const patternInput = document.getElementById('rx-pattern');
    const flagsInput = document.getElementById('rx-flags');
    const replaceInput = document.getElementById('rx-replace');
    const textArea = document.getElementById('rx-text');
    const resultBox = document.getElementById('rxResult');
    const btnTest = document.getElementById('btnRxTest');
    const btnExec = document.getElementById('btnRxExec');
    const btnReplace = document.getElementById('btnRxReplace');

    if (!btnTest) return;

    function buildRegex() {
      const pattern = patternInput.value;
      const flags = parseFlags(flagsInput.value);
      return new RegExp(pattern, flags);
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    btnTest.addEventListener('click', () => {
      hideAlert('rxAlert');
      try {
        const regex = buildRegex();
        const texto = textArea.value;
        const coincide = regex.test(texto);
        resultBox.innerHTML = `
          <p><strong>RegExp.test()</strong> devolvió:</p>
          <span class="badge ${coincide ? 'badge-teal' : ''}">${coincide ? 'true — hay coincidencia' : 'false — sin coincidencia'}</span>
        `;
        window.Storage.SS.logAction(`Ejecutó test() con /${patternInput.value}/`);
      } catch (err) {
        showAlert('rxAlert', 'err', 'Expresión regular inválida: ' + err.message);
      }
    });

    btnExec.addEventListener('click', () => {
      hideAlert('rxAlert');
      try {
        const flags = parseFlags(flagsInput.value).includes('g')
          ? parseFlags(flagsInput.value)
          : parseFlags(flagsInput.value) + 'g'; // forzamos global para recorrer todas
        const regex = new RegExp(patternInput.value, flags);
        const texto = textArea.value;
        const coincidencias = [];
        let match;
        let highlighted = escapeHtml(texto);
        while ((match = regex.exec(texto)) !== null) {
          coincidencias.push({ texto: match[0], indice: match.index, grupos: match.slice(1) });
          if (match.index === regex.lastIndex) regex.lastIndex++; // evita bucle infinito con patrones vacíos
        }
        // resaltado visual simple usando el mismo patrón con flag g
        const regexHi = new RegExp(patternInput.value, flags);
        highlighted = escapeHtml(texto).replace(regexHi, (m) => `<mark>${escapeHtml(m)}</mark>`);

        resultBox.innerHTML = `
          <p><strong>RegExp.exec()</strong> encontró ${coincidencias.length} coincidencia(s):</p>
          <div class="highlighted" style="margin-bottom:10px; line-height:1.8;">${highlighted}</div>
          ${coincidencias.map(c => `<span class="match-chip">"${escapeHtml(c.texto)}" @ ${c.indice}</span>`).join('') || '<p class="text-faint small">Sin coincidencias.</p>'}
        `;
        window.Storage.SS.logAction(`Ejecutó exec() con /${patternInput.value}/ (${coincidencias.length} match)`);
      } catch (err) {
        showAlert('rxAlert', 'err', 'Expresión regular inválida: ' + err.message);
      }
    });

    btnReplace.addEventListener('click', () => {
      hideAlert('rxAlert');
      try {
        const regex = buildRegex();
        const texto = textArea.value;
        const reemplazo = replaceInput.value;
        const resultado = texto.replace(regex, reemplazo);
        resultBox.innerHTML = `
          <p><strong>String.replace()</strong> resultado:</p>
          <textarea class="mono" rows="5" readonly>${escapeHtml(resultado)}</textarea>
        `;
        window.Storage.SS.logAction(`Ejecutó replace() con /${patternInput.value}/`);
      } catch (err) {
        showAlert('rxAlert', 'err', 'Expresión regular inválida: ' + err.message);
      }
    });
  }

  /* =========================================================================
     6. INICIALIZACIÓN
     ======================================================================= */

  window.Validaciones = {
    validarNombre, validarCorreo, validarTelefono, validarFechaNacimiento,
    validarUsuario, validarPassword, evaluarFortaleza,
    initRegistro, initLogin, initRegexEngine, actualizarSessionPill
  };
})();
