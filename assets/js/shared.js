/* ===========================================================
   PCT em Rede / CASPCT-SES-PE — utilidades compartilhadas
   Protocolos, registros e inscrição no canal de informações.
   Guarda uma cópia local (localStorage, por navegador) e, se
   configurado, envia cada registro para uma Planilha Google via
   Google Apps Script — é assim que a equipe da coordenação
   consegue ver os registros de qualquer navegador, num só lugar.
   =========================================================== */

const CASPCT = (() => {
  // Preencher com a URL de implantação do Google Apps Script (termina em
  // "/exec") depois de publicar o script — ver guia de configuração.
  // Enquanto estiver vazio, os registros ficam só no localStorage.
  const SHEET_WEBHOOK_URL = '';

  const KEYS = {
    counters: 'caspct_protocol_counters',
    records: 'caspct_records',
    subscriber: 'caspct_subscriber',
  };

  function sendToSheet(payload) {
    if (!SHEET_WEBHOOK_URL) return;
    // no-cors: não conseguimos ler a resposta, mas o Apps Script recebe e
    // grava a linha normalmente. Falha silenciosa para nunca travar o chat.
    fetch(SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  function nowStr() {
    return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function isBusinessHours(date = new Date()) {
    const day = date.getDay(); // 0 dom ... 6 sáb
    const hour = date.getHours();
    return day >= 1 && day <= 5 && hour >= 8 && hour < 17;
  }

  function nextProtocol(prefix) {
    const counters = JSON.parse(localStorage.getItem(KEYS.counters) || '{}');
    const year = new Date().getFullYear();
    counters[prefix] = counters[prefix] || {};
    counters[prefix][year] = (counters[prefix][year] || 0) + 1;
    localStorage.setItem(KEYS.counters, JSON.stringify(counters));
    const n = String(counters[prefix][year]).padStart(3, '0');
    return `${prefix}-${year}-${n}`;
  }

  function saveRecord(record) {
    const withDate = { ...record, criadoEm: nowStr() };
    const list = JSON.parse(localStorage.getItem(KEYS.records) || '[]');
    list.push(withDate);
    localStorage.setItem(KEYS.records, JSON.stringify(list));
    sendToSheet({ sheet: 'registros', ...withDate });
    return record;
  }

  function findRecord(protocolo) {
    const list = JSON.parse(localStorage.getItem(KEYS.records) || '[]');
    return list.find(r => (r.protocolo || '').toLowerCase() === protocolo.trim().toLowerCase());
  }

  function searchRecordsByText(text) {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const list = JSON.parse(localStorage.getItem(KEYS.records) || '[]');
    return list.filter(r =>
      (r.nome || '').toLowerCase().includes(q) ||
      (r.comunidade || '').toLowerCase().includes(q)
    );
  }

  function getSubscriber() {
    return JSON.parse(localStorage.getItem(KEYS.subscriber) || 'null');
  }

  function setSubscriber(obj) {
    localStorage.setItem(KEYS.subscriber, JSON.stringify(obj));
    sendToSheet({ sheet: 'inscritos', ...obj });
    return obj;
  }

  function extractFirstLine(text, fallback = 'você') {
    const line = (text || '')
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0) || '';
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
    return cleaned ? cleaned.slice(0, 60) : fallback;
  }

  function extractLine(text, index, fallback = '') {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const line = lines[index];
    if (!line) return fallback;
    return line.replace(/^\d+[\.\)]\s*/, '').trim().slice(0, 120) || fallback;
  }

  return {
    nowStr, isBusinessHours, nextProtocol,
    saveRecord, findRecord, searchRecordsByText,
    getSubscriber, setSubscriber,
    extractFirstLine, extractLine,
  };
})();
