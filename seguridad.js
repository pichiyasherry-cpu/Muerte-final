/* =========================================================================
   seguridad.js — Módulo IV: Encriptación personalizada
   + Desafío Extra: función hash propia para no guardar contraseñas
     en texto plano dentro de localStorage.
   Expone: window.Security
   ========================================================================= */

(function () {
  'use strict';

  /* =========================================================================
     1. ALGORITMO DE ENCRIPTACIÓN PROPIO (sustitución de vocales)
     A → @1   E → #2   I → &3   O → *4   U → %5
     Reversible en ambas direcciones.
     ======================================================================= */

  const ENCRYPT_MAP = { A: '@1', E: '#2', I: '&3', O: '*4', U: '%5' };
  const DECRYPT_MAP = Object.fromEntries(
    Object.entries(ENCRYPT_MAP).map(([letter, code]) => [code, letter])
  );

  // Patrón que reconoce cualquiera de los tokens cifrados: @1, #2, &3, *4, %5
  const DECRYPT_PATTERN = /@1|#2|&3|\*4|%5/g;

  function encryptText(text) {
    let result = '';
    for (const ch of text) {
      result += ENCRYPT_MAP[ch] !== undefined ? ENCRYPT_MAP[ch] : ch;
    }
    return result;
  }

  function decryptText(text) {
    return text.replace(DECRYPT_PATTERN, (token) => DECRYPT_MAP[token]);
  }

  /* =========================================================================
     2. FUNCIÓN HASH PROPIA (Desafío Extra +10 pts)
     No es un algoritmo criptográfico de nivel productivo, pero cumple el
     requisito de NO almacenar contraseñas en texto plano: aplica múltiples
     rondas de mezcla bit a bit (rotaciones + XOR + primos) sobre una sal
     aleatoria única por usuario.
     ======================================================================= */

  function generateSalt(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    const rand = new Uint32Array(length);
    (window.crypto || window.msCrypto).getRandomValues(rand);
    for (let i = 0; i < length; i++) salt += chars[rand[i] % chars.length];
    return salt;
  }

  function rotl(x, n) {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  /**
   * customHash: algoritmo propio de mezcla (estilo FNV/DJB2 extendido).
   * Ejecuta varias rondas para dificultar ataques de fuerza bruta simples.
   */
  function customHash(input, rounds = 5) {
    let h1 = 0x811c9dc5; // semilla prima (base FNV)
    let h2 = 0x1000193;

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < input.length; i++) {
        const code = input.charCodeAt(i) + round * 31;
        h1 ^= code;
        h1 = Math.imul(h1, 16777619) >>> 0;
        h1 = rotl(h1, (i % 13) + 1);

        h2 = (h2 + code * (i + 1 + round)) >>> 0;
        h2 = Math.imul(h2, 2654435761) >>> 0;
        h2 ^= rotl(h2, (i % 7) + 3);
      }
    }
    // combinamos ambos estados en un hex de 16 caracteres
    const combined = (BigInt(h1 >>> 0) << 32n) | BigInt(h2 >>> 0);
    return combined.toString(16).padStart(16, '0');
  }

  function hashPassword(plainPassword) {
    const salt = generateSalt();
    const hash = customHash(salt + plainPassword);
    return { salt, hash };
  }

  function verifyPassword(plainPassword, salt, expectedHash) {
    return customHash(salt + plainPassword) === expectedHash;
  }

  /* =========================================================================
     3. INTERFAZ — panel de encriptación
     ======================================================================= */

  function renderCryptoHistory() {
    const container = document.getElementById('cryptoHistList');
    const counter = document.getElementById('cryptoHistCount');
    if (!container || !window.Storage) return;

    const hist = window.Storage.LS.getCryptoHistory();
    counter.textContent = hist.length;

    if (hist.length === 0) {
      container.innerHTML = '<p class="text-faint small">Todavía no hay operaciones registradas.</p>';
      return;
    }

    container.innerHTML = hist.slice(0, 8).map(entry => `
      <div class="list-item">
        <div class="li-main">
          <span class="li-key">${entry.modo === 'encriptar' ? 'ENCRIPTAR' : 'DESENCRIPTAR'}</span>
          <span class="li-val">${escapeHtml(entry.entrada)} → ${escapeHtml(entry.salida)}</span>
          <span class="li-val text-faint">${entry.charsAntes} → ${entry.charsDespues} caracteres · ${new Date(entry.timestamp).toLocaleString('es-GT')}</span>
        </div>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function registerOperation(modo, entrada, salida) {
    const entry = {
      modo,
      entrada,
      salida,
      charsAntes: entrada.length,
      charsDespues: salida.length,
      timestamp: new Date().toISOString()
    };
    window.Storage.LS.addCryptoHistory(entry);
    return entry;
  }

  function initCryptoPanel() {
    const input = document.getElementById('crypto-input');
    const output = document.getElementById('crypto-output');
    const before = document.getElementById('cryptoBefore');
    const after = document.getElementById('cryptoAfter');
    const when = document.getElementById('cryptoWhen');
    const btnEncrypt = document.getElementById('btnEncrypt');
    const btnDecrypt = document.getElementById('btnDecrypt');
    const btnClear = document.getElementById('btnCryptoClear');
    const btnClearHist = document.getElementById('btnClearCryptoHist');

    if (btnEncrypt) {
      btnEncrypt.addEventListener('click', () => {
        const text = input.value;
        const result = encryptText(text);
        output.value = result;
        before.textContent = text.length;
        after.textContent = result.length;
        when.textContent = new Date().toLocaleTimeString('es-GT');
        registerOperation('encriptar', text, result);
        renderCryptoHistory();
        if (window.Storage) window.Storage.SS.logAction('Encriptó un texto');
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    }

    if (btnDecrypt) {
      btnDecrypt.addEventListener('click', () => {
        const text = input.value;
        const result = decryptText(text);
        output.value = result;
        before.textContent = text.length;
        after.textContent = result.length;
        when.textContent = new Date().toLocaleTimeString('es-GT');
        registerOperation('desencriptar', text, result);
        renderCryptoHistory();
        if (window.Storage) window.Storage.SS.logAction('Desencriptó un texto');
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        input.value = '';
        output.value = '';
        before.textContent = '0';
        after.textContent = '0';
        when.textContent = '—';
      });
    }

    if (btnClearHist) {
      btnClearHist.addEventListener('click', () => {
        if (!confirm('¿Vaciar el historial de encriptación?')) return;
        window.Storage.LS.clearCryptoHistory();
        renderCryptoHistory();
        if (window.Dashboard) window.Dashboard.refreshStats();
      });
    }

    renderCryptoHistory();
  }

  window.Security = {
    encryptText,
    decryptText,
    hashPassword,
    verifyPassword,
    customHash,
    initCryptoPanel,
    renderCryptoHistory
  };
})();
