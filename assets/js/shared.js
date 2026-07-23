/* ===========================================================
   PCT em Rede / CASPCT-SES-PE — utilidades compartilhadas
   Simulação local (localStorage) de protocolos, registros e
   inscrição no canal de informações. Sem backend real.
   =========================================================== */

const CASPCT = (() => {
  const KEYS = {
    counters: 'caspct_protocol_counters',
    records: 'caspct_records',
    subscriber: 'caspct_subscriber',
  };

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
    const list = JSON.parse(localStorage.getItem(KEYS.records) || '[]');
    list.push({ ...record, criadoEm: nowStr() });
    localStorage.setItem(KEYS.records, JSON.stringify(list));
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
