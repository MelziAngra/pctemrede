/* ===========================================================
   PCT em Rede — Chatbot
   Implementa o fluxo conversacional do canal CASPCT/SES-PE
   (piloto WhatsApp Business) em uma interface web de demonstração.
   =========================================================== */

(() => {
  const chatLog = document.getElementById('chat-log');
  const quickRepliesEl = document.getElementById('quick-replies');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  const FORM_LINK = 'form.html';

  // Cores por função (06 / 18 do Manual de Identidade)
  // "alerta" é uma extensão além do manual original, para a Vigilância em
  // Saúde e Clima (projeto SNTI/PCT) — sinaliza urgência, distinta das
  // demais frentes.
  const COLORS = {
    verde: '#2F5D50',
    terracota: '#C56A3D',
    mostarda: '#D89B2D',
    azul: '#1F5EA8',
    cinza: '#6B6B6B',
    alerta: '#A3324B',
  };

  const MENU_OPTIONS = [
    { key: '1', cmd: '/reuniao', title: 'Solicitar reunião', sub: 'com a coordenação', icon: '🗓️', color: COLORS.azul, run: flowReuniao },
    { key: '2', cmd: '/pauta', title: 'Apresentar pauta ou demanda', sub: '', icon: '📣', color: COLORS.terracota, run: () => flowPauta() },
    { key: '3', cmd: '/cadastro', title: 'Cadastrar minha comunidade', sub: '', icon: '⌂', color: COLORS.verde, run: flowCadastro },
    { key: '4', cmd: '/informacoes', title: 'Receber informações da coordenação', sub: '', icon: 'ⓘ', color: COLORS.mostarda, run: flowInformacoes },
    { key: '5', cmd: '/andamento', title: 'Falar sobre uma ação já em andamento', sub: '', icon: '→', color: COLORS.azul, run: flowAndamento },
    { key: '6', cmd: '/outro', title: 'Outro assunto', sub: '', icon: '💬', color: COLORS.cinza, run: () => flowOutro() },
    { key: '7', cmd: '/vigilancia', title: 'Vigilância em Saúde e Clima', sub: 'agravos, água, enchentes, secas e emergências', icon: '🌊', color: COLORS.alerta, run: flowVigilancia },
    { key: '8', cmd: '/articulacao', title: 'Entre Redes: outras políticas e públicos', sub: 'idoso, criança, mulher, LGBTQIAPN+ e mais', icon: '🔗', color: COLORS.azul, run: flowArticulacao },
  ];

  // Entre Redes — articulação transversal da saúde de PCT com outras
  // políticas e públicos específicos de saúde. Cada categoria mostra uma
  // explicação de para que serve aquela articulação antes de capturar a
  // demanda, e indica a política/coordenação real com a qual se conecta.
  const ARTICULACAO_CATEGORIAS = [
    { key: 'idoso', label: 'Saúde do Idoso', icon: '🧓', politica: 'Política Nacional de Saúde da Pessoa Idosa', explicacao: 'Conecta sua demanda com a Política Nacional de Saúde da Pessoa Idosa — cuidado, mobilidade, acesso a benefícios e valorização dos saberes das pessoas mais velhas do território.' },
    { key: 'crianca', label: 'Saúde da Criança', icon: '👶', politica: 'Atenção Integral à Saúde da Criança', explicacao: 'Conecta com a Política Nacional de Atenção Integral à Saúde da Criança — puericultura, vacinação, desenvolvimento infantil e primeira infância no território.' },
    { key: 'homem', label: 'Saúde do Homem', icon: '👨', politica: 'Atenção Integral à Saúde do Homem', explicacao: 'Conecta com a Política Nacional de Atenção Integral à Saúde do Homem — acesso e adesão dos homens do território aos serviços de saúde e prevenção.' },
    { key: 'adolescente', label: 'Saúde do Adolescente', icon: '🧑', politica: 'Atenção à Saúde do Adolescente e do Jovem', explicacao: 'Conecta com a atenção à saúde de adolescentes e jovens — saúde sexual e reprodutiva, prevenção e protagonismo juvenil no território.' },
    { key: 'mulher', label: 'Saúde da Mulher', icon: '👩', politica: 'Atenção Integral à Saúde da Mulher', explicacao: 'Conecta com a Política Nacional de Atenção Integral à Saúde da Mulher — pré-natal, parto, planejamento reprodutivo e cuidado, podendo se articular com parteiras tradicionais do território.' },
    { key: 'lgbt', label: 'Saúde LGBTQIAPN+', icon: '🏳️‍🌈', politica: 'Saúde Integral de LGBTQIAPN+', explicacao: 'Conecta com a Política Nacional de Saúde Integral de LGBTQIAPN+ — acesso equânime e sem discriminação nos serviços de saúde.' },
    { key: 'deficiencia', label: 'Pessoa com Deficiência', icon: '♿', politica: 'Saúde da Pessoa com Deficiência', explicacao: 'Conecta com a Política Nacional de Saúde da Pessoa com Deficiência — acessibilidade, reabilitação e cuidado continuado no território.' },
    { key: 'tea', label: 'TEA (Transtorno do Espectro Autista)', icon: '🧩', politica: 'Rede de Atenção à Pessoa com TEA', explicacao: 'Conecta com a rede de atenção à pessoa com Transtorno do Espectro Autista (TEA) — diagnóstico, cuidado e apoio às famílias do território.' },
    { key: 'nutricao', label: 'Nutrição e Segurança Alimentar', icon: '🌾', politica: 'Segurança Alimentar e Nutricional', explicacao: 'Conecta com a Segurança Alimentar e Nutricional — combate à insegurança alimentar e valorização da alimentação e produção tradicional do território.' },
    { key: 'racial', label: 'Saúde da População Negra e Igualdade Racial', icon: '✊🏾', politica: 'Saúde Integral da População Negra', explicacao: 'Conecta com a Política Nacional de Saúde Integral da População Negra — enfrentamento ao racismo institucional e promoção da equidade racial no cuidado.' },
    { key: 'rua', label: 'Pessoa em Situação de Rua', icon: '🏙️', politica: 'Política para a População em Situação de Rua', explicacao: 'Conecta com a Política Nacional para a População em Situação de Rua — atenção a pessoas do território que estejam ou tenham passado por situação de rua.' },
    { key: 'migrantes', label: 'Migrantes (inclui tradução/intérprete)', icon: '🌍', politica: 'Atenção à Saúde de Migrantes e Refugiados', explicacao: 'Conecta com a rede de atenção a migrantes e refugiados — inclui apoio de tradução/intérprete quando a barreira de idioma dificultar o atendimento.' },
    { key: 'parteiras', label: 'Cadastro de Parteiras e Benzedeiras', icon: '🤲', politica: 'Reconhecimento de Práticas Tradicionais de Cuidado', explicacao: 'Registra parteiras tradicionais, rezadeiras e benzedeiras do território junto à coordenação, para reconhecimento e articulação com o serviço de saúde local.', pergunta: 'Quem são as parteiras, rezadeiras ou benzedeiras da comunidade que você quer registrar? Inclua nome, o que fazem (parto, reza, uso de plantas etc.), comunidade/território, município e um contato (delas ou de quem está indicando).' },
    { key: 'violencia_mulher', label: 'Violência contra a Mulher', icon: '🚨', politica: 'Rede de Enfrentamento à Violência contra a Mulher', explicacao: 'Conecta com a rede de enfrentamento à violência contra a mulher (Lei Maria da Penha) — CRAS/CREAS, Ligue 180 e a rede de proteção.' },
    { key: 'ist', label: 'IST', icon: '✚', politica: 'Programa Estadual de IST/Aids', explicacao: 'Conecta com o Programa Estadual de IST/Aids — prevenção, testagem e tratamento de Infecções Sexualmente Transmissíveis.' },
    { key: 'trabalhador_redes', label: 'Saúde do Trabalhador', icon: '👷', politica: 'CEREST — Saúde do Trabalhador', explicacao: 'Conecta com o CEREST (Centro de Referência em Saúde do Trabalhador) — acidentes e adoecimento relacionados ao trabalho no território.' },
  ];

  // Categorias da Vigilância em Saúde e Clima — espelha a tabela 3.3 do
  // projeto SNTI/PCT (categorias, prazo de resposta e lista de operação
  // institucional acionada por tipo de ocorrência).
  const VIGILANCIA_CATEGORIAS = [
    { key: 'agravo', label: 'Agravo de saúde / surto', icon: '🦠', sheet: 'vigilancia_saude', categoria: 'Agravo epidemiológico', prazo: 'Imediato (< 1h)', lista: 'GERES competente + COVISA municipal + COPCT/SES-PE' },
    { key: 'enchente', label: 'Enchente ou alagamento', icon: '🌊', sheet: 'mudancas_climaticas', categoria: 'Enchente / Alagamento', prazo: 'Imediato (< 1h)', lista: 'Defesa Civil Estadual + GERES + COPCT + COAS/SES-PE' },
    { key: 'seca', label: 'Seca ou falta d\'água', icon: '☀️', sheet: 'mudancas_climaticas', categoria: 'Seca / Escassez hídrica', prazo: 'Imediato (< 1h)', lista: 'Defesa Civil Estadual + GERES + COPCT + COAS/SES-PE' },
    { key: 'clima_extremo', label: 'Outro evento climático extremo', icon: '🌡️', sheet: 'mudancas_climaticas', categoria: 'Evento climático extremo', prazo: 'Imediato (< 1h)', lista: 'Defesa Civil Estadual + GERES + COPCT + COAS/SES-PE' },
    { key: 'ambiental', label: 'Contaminação / emergência ambiental', icon: '☠️', sheet: 'vigilancia_saude', categoria: 'Emergência ambiental', prazo: 'Imediato (< 1h)', lista: 'CPRH + Defesa Civil + COVISA + COPCT + Saúde do Trabalhador' },
    { key: 'trabalhador', label: 'Saúde do trabalhador / acidente', icon: '👷', sheet: 'vigilancia_saude', categoria: 'Saúde do trabalhador', prazo: 'Até 2h', lista: 'CEREST Regional + GERES + Vigilância Sanitária + COPCT' },
    { key: 'acesso', label: 'Falta de acesso a serviço de saúde', icon: '🚫', sheet: 'vigilancia_saude', categoria: 'Acesso a serviços', prazo: 'Até 4h', lista: 'GERES + Município + COPCT + DAB/SES-PE' },
    { key: 'violencia', label: 'Violência / situação de vulnerabilidade', icon: '⚠️', sheet: 'vigilancia_saude', categoria: 'Violência', prazo: 'Até 2h', lista: 'COPCT + CRAS/CREAS municipal + Saúde Mental + GERES' },
    { key: 'outro', label: 'Outro tipo de situação', icon: '💬', sheet: 'vigilancia_saude', categoria: 'Outro', prazo: 'A definir', lista: 'COPCT/SES-PE' },
  ];

  // Entradas diretas das três frentes do Manual de Identidade (05. Submarcas).
  // Cada uma pula o menu geral e cai direto no fluxo de captação mais
  // adequado do canal CASPCT, mantendo a identidade visual da frente.
  // Acesso via ?entrada=vozes | ?entrada=escuta | ?entrada=redes na URL
  // (usado pelos QR Codes dos cards de divulgação).
  const FRENTES = {
    vozes: {
      titulo: 'Vozes do Território',
      desc: 'Fale diretamente com a Coordenação.',
      assinatura: 'Sua voz chega.\nO território é ouvido.',
      color: COLORS.verde,
      run() { return flowOutro({ origem: this.titulo, color: this.color }); },
    },
    escuta: {
      titulo: 'Escuta PCT',
      desc: 'Tem uma demanda? Precisa denunciar? Está enfrentando uma situação urgente?',
      assinatura: 'Escutar para agir.',
      color: COLORS.terracota,
      run() { return flowPauta({ origem: this.titulo, color: this.color }); },
    },
    redes: {
      titulo: 'Entre Redes',
      desc: 'Sua demanda precisa de articulação? Conectamos você às redes e políticas necessárias.',
      assinatura: 'Articulando redes para cuidar dos territórios.',
      color: COLORS.azul,
      run() { return flowPauta({ origem: this.titulo, color: this.color }); },
    },
  };

  const URGENCY_WORDS = ['emergência', 'emergencia', 'infarto', 'socorro', 'passando mal', 'sangrando', 'convulsão', 'convulsao', 'engasg'];

  // Aviso padrão sobre como o retorno da coordenação pode chegar — anexado
  // às confirmações de registro (o chatbot não consegue mandar mensagem
  // sozinho para ninguém, então o retorno depende do contato informado).
  const NOTA_CONTATO = '📞 O retorno da coordenação pode vir por telefone/WhatsApp ou e-mail — o que você preferir. Garanta que informou um contato de fácil acesso na sua mensagem, ou digite MENU e escolha a opção 5 (Ação em andamento) para consultar o protocolo depois.';

  // ---------- estado ----------
  let pendingResolver = null;   // função chamada com o próximo texto livre do usuário
  let pendingCollector = null;  // acumulador multi-etapas (usado no cadastro em 3 blocos)
  let awaitingLabel = '';       // placeholder do campo de texto

  // ---------- helpers de UI ----------
  function scrollToBottom() {
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function setAccent(hex) {
    document.documentElement.style.setProperty('--accent', hex);
  }

  function addMessage(text, { from = 'bot', system = false, html = false } = {}) {
    const div = document.createElement('div');
    div.className = 'msg ' + from + (system ? ' system-note' : '');
    if (html) {
      div.innerHTML = text;
    } else {
      div.textContent = text;
    }
    chatLog.appendChild(div);
    scrollToBottom();
    return div;
  }

  function botSay(text, opts = {}) {
    return new Promise(resolve => {
      const delay = Math.min(900, 250 + text.length * 3);
      setTimeout(() => {
        addMessage(text, { from: 'bot', ...opts });
        resolve();
      }, delay);
    });
  }

  function userSay(text) {
    addMessage(text, { from: 'user' });
  }

  function clearQuickReplies() {
    quickRepliesEl.innerHTML = '';
  }

  function showQuickReplies(options) {
    clearQuickReplies();
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.setProperty('--qr-color', opt.color || COLORS.mostarda);
      btn.innerHTML = `<span class="qr-title">${opt.icon ? opt.icon + ' ' : ''}${opt.label}</span>` +
        (opt.sub ? `<span class="qr-sub">${opt.sub}</span>` : '');
      btn.addEventListener('click', () => {
        userSay(opt.label.replace(/^[^\wÀ-ÿ]+/, '').trim());
        clearQuickReplies();
        opt.onClick();
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  // O campo de texto permanece sempre habilitado (como no WhatsApp real: dá para
  // digitar MENU, SAIR ou o número de uma opção a qualquer momento). "enable/disable"
  // aqui só trocam o texto de dica e limpam o resolvedor pendente do fluxo anterior.
  function enableFreeInput(placeholder) {
    awaitingLabel = placeholder || 'Digite sua mensagem...';
    input.placeholder = awaitingLabel;
    input.focus();
  }

  function disableFreeInput() {
    input.placeholder = 'Digite sua mensagem ou o número da opção...';
    pendingResolver = null;
  }

  function menuQuickReplyList() {
    return MENU_OPTIONS.map(o => ({
      label: `${o.key} — ${o.title}`,
      color: o.color,
      onClick: () => o.run(),
    }));
  }

  // ---------- comandos globais ----------
  async function handleUserInput(raw) {
    const text = raw.trim();
    if (!text) return;
    userSay(text);
    input.value = '';

    const norm = text.toLowerCase();

    // checagem de segurança: sinais de urgência clínica em qualquer momento
    if (URGENCY_WORDS.some(w => norm.includes(w))) {
      disableFreeInput();
      await showUrgencia();
      return;
    }

    // comandos globais interrompem qualquer fluxo em andamento
    if (norm === 'menu' || norm === '/menu') {
      pendingResolver = null; pendingCollector = null;
      disableFreeInput();
      await showMainMenu();
      return;
    }
    if (norm === 'sair' || norm === '/sair') {
      pendingResolver = null; pendingCollector = null;
      disableFreeInput();
      await handleOptOut();
      return;
    }
    if (norm === 'voltar') {
      pendingResolver = null; pendingCollector = null;
      disableFreeInput();
      await handleOptBackIn();
      return;
    }
    if (norm === '/geres') { disableFreeInput(); await showGeres(); return; }
    if (norm === '/urgencia') { disableFreeInput(); await showUrgencia(); return; }
    if (norm === '/oficio') { disableFreeInput(); await showOficio(); return; }

    // atalhos numéricos/slash do menu — válidos a qualquer momento
    const byKey = MENU_OPTIONS.find(o => o.key === norm || o.cmd === norm);
    if (byKey && !pendingResolver) {
      disableFreeInput();
      await byKey.run();
      return;
    }

    if (norm === 'cadastro aqui') {
      disableFreeInput();
      await cadastroLite();
      return;
    }

    // se há um resolvedor pendente (estamos esperando resposta de um fluxo), delega a ele
    if (pendingResolver) {
      const resolver = pendingResolver;
      pendingResolver = null;
      disableFreeInput();
      await resolver(text);
      return;
    }

    // nenhum contexto ativo: fallback
    disableFreeInput();
    await botSay('Não entendi. Digite MENU para ver as opções, ou toque em um dos botões abaixo.');
    showQuickReplies(menuQuickReplyList());
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleUserInput(input.value);
    input.style.height = 'auto';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput(input.value);
      input.style.height = 'auto';
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  // ---------- 0. saudação ----------
  async function start() {
    disableFreeInput();
    if (!CASPCT.isBusinessHours()) {
      await botSay(
        'Recebemos sua mensagem! 🌱\n\n' +
        'Nosso atendimento é de segunda a sexta, das 8h às 17h. Sua mensagem será lida no próximo dia útil.\n\n' +
        '⚠️ Em caso de emergência de saúde, procure a UPA mais próxima ou ligue 192 (SAMU).',
        { system: true }
      );
    }

    // Entrada direta de uma das três frentes (?entrada=vozes|escuta|redes),
    // usada pelos QR Codes dos cards de divulgação — pula o menu geral.
    const entradaKey = new URLSearchParams(window.location.search).get('entrada');
    const frente = entradaKey && FRENTES[entradaKey];
    if (frente) {
      setAccent(frente.color);
      await botSay(
        `${frente.titulo}\n${frente.desc}\n\n` +
        `${frente.assinatura}\n\n` +
        '⚠️ Este canal não atende emergências de saúde. Em caso de urgência, procure a UPA mais próxima ou ligue 192 (SAMU).\n\n' +
        '(A qualquer momento, digite MENU para ver todas as opções do PCT em Rede.)'
      );
      await frente.run();
      return;
    }

    setAccent(COLORS.mostarda);
    await botSay(
      'Olá! Você chegou ao canal oficial da Coordenação de Atenção à Saúde de Povos e Comunidades Tradicionais (CASPCT) da Secretaria Estadual de Saúde de Pernambuco — PCT em Rede.\n\n' +
      'Este canal é para diálogo com povos e comunidades tradicionais, movimentos sociais, lideranças e organizações de Pernambuco.\n\n' +
      '⚠️ Este canal não atende emergências de saúde. Em caso de urgência, procure a UPA mais próxima ou ligue 192 (SAMU).\n\n' +
      'Escolha uma opção abaixo ou digite o número desejado.\n\n' +
      'Nosso atendimento é de segunda a sexta, das 8h às 17h.'
    );
    showQuickReplies(menuQuickReplyList());
  }

  async function showMainMenu() {
    setAccent(COLORS.mostarda);
    await botSay(
      'Menu da CASPCT — escolha uma opção ou digite o número:\n\n' +
      '1 Reunião · 2 Pauta/demanda · 3 Cadastro de comunidade\n' +
      '4 Receber informações · 5 Ação em andamento · 6 Outro assunto\n' +
      '7 Vigilância em Saúde e Clima · 8 Entre Redes (outras políticas)\n\n' +
      'A qualquer momento, digite MENU para voltar aqui.'
    );
    showQuickReplies(menuQuickReplyList());
  }

  // ---------- 1. Reunião ----------
  async function flowReuniao() {
    setAccent(COLORS.azul);
    await botSay(
      'Vamos registrar seu pedido de reunião. Por favor, responda em uma única mensagem com:\n\n' +
      '1. Seu nome completo\n' +
      '2. Comunidade / organização / movimento que representa\n' +
      '3. Município e território\n' +
      '4. Assunto da reunião (em poucas linhas)\n' +
      '5. Quantas pessoas pretendem participar\n' +
      '6. Preferência de formato: presencial, on-line ou indiferente\n\n' +
      'Depois de receber, a coordenação retorna com uma proposta de data em até 10 dias úteis.'
    );
    enableFreeInput('Digite sua resposta completa...');
    pendingResolver = async (text) => {
      const nome = CASPCT.extractLine(text, 0, 'você');
      const comunidade = CASPCT.extractLine(text, 1, '');
      const protocolo = CASPCT.nextProtocol('REU');
      CASPCT.saveRecord({ protocolo, tipo: 'Reunião', nome, comunidade, detalhes: text, status: 'Pendente' });

      await botSay(
        `Recebemos seu pedido de reunião, ${nome}.\n\n` +
        `Protocolo: ${protocolo}\n` +
        `Registrado em: ${CASPCT.nowStr()}\n\n` +
        'A coordenação vai analisar e retornar com proposta de data em até 10 dias úteis. Guarde este protocolo para acompanhamento.\n\n' +
        'Enquanto isso: sua comunidade já está cadastrada conosco? Se ainda não, toque em "Cadastrar" — o cadastro ajuda a coordenação a planejar ações no seu território.\n\n' +
        NOTA_CONTATO
      );
      showQuickReplies([
        { label: '⌂ Cadastrar minha comunidade', color: COLORS.verde, onClick: flowCadastro },
        { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
      ]);
    };
  }

  // ---------- 2. Pauta / demanda ----------
  async function flowPauta({ origem, color } = {}) {
    setAccent(color || COLORS.terracota);
    await botSay(
      'Queremos registrar sua demanda com clareza. Responda em uma mensagem:\n\n' +
      '1. Seu nome e comunidade/organização\n' +
      '2. Município e território\n' +
      '3. Qual a situação ou problema\n' +
      '4. Há quanto tempo isso acontece\n' +
      '5. Vocês já procuraram algum serviço, secretaria municipal ou GERES? Qual foi a resposta?\n' +
      '6. O que vocês esperam da coordenação\n\n' +
      'Se tiver documentos, fotos ou ofícios, pode enviar em seguida (fora deste protótipo).'
    );
    enableFreeInput('Descreva a demanda...');
    pendingResolver = async (text) => {
      const nome = CASPCT.extractLine(text, 0, 'você');
      const protocolo = CASPCT.nextProtocol('PAU');
      CASPCT.saveRecord({ protocolo, tipo: 'Pauta/Demanda', origem: origem || 'Menu geral', nome, detalhes: text, status: 'Pendente' });

      await botSay(
        `Demanda registrada, ${nome}.\n\n` +
        `Protocolo: ${protocolo}\n` +
        `Registrado em: ${CASPCT.nowStr()}\n\n` +
        'A coordenação vai analisar e encaminhar internamente. Você receberá retorno sobre o andamento.\n\n' +
        'ℹ️ Importante: a CASPCT atua na formulação e no acompanhamento de políticas. Algumas demandas precisam ser encaminhadas à GERES da sua região ou à secretaria municipal — quando for o caso, informamos o caminho e acompanhamos.\n\n' +
        NOTA_CONTATO
      );
      showQuickReplies([
        { label: '📍 Sobre encaminhamento à GERES', color: COLORS.azul, onClick: showGeres },
        { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
      ]);
    };
  }

  // ---------- 3. Cadastro ----------
  async function flowCadastro() {
    setAccent(COLORS.verde);
    await botSay(
      'Que bom que sua comunidade quer se cadastrar!\n\n' +
      'O cadastro permite que a coordenação:\n' +
      '• conheça a realidade do seu território\n' +
      '• envie informações sobre ações, editais e políticas que afetam vocês\n' +
      '• planeje visitas e atividades com mais precisão\n\n' +
      'Você pode preencher o formulário completo (cerca de 8 minutos) ou responder por aqui mesmo, de forma resumida.'
    );
    showQuickReplies([
      { label: '📄 Abrir formulário completo', sub: FORM_LINK, color: COLORS.verde, onClick: () => { window.open(FORM_LINK, '_blank', 'noopener'); showQuickReplies([
        { label: '✍️ Prefiro responder por aqui (CADASTRO AQUI)', color: COLORS.verde, onClick: cadastroLite },
        { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
      ]); } },
      { label: '✍️ CADASTRO AQUI (responder por mensagem)', color: COLORS.terracota, onClick: cadastroLite },
      { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
    ]);
  }

  const CADASTRO_BLOCKS = [
    'Bloco 1 de 3 — Identificação\n\n' +
      '1. Nome da comunidade, povo ou grupo\n' +
      '2. Segmento (ex.: quilombola, indígena, cigano, terreiro, pescador artesanal, marisqueira, ribeirinho, agricultor familiar tradicional, etc.)\n' +
      '3. A comunidade possui certificação ou reconhecimento oficial? Qual?\n\n' +
      'Responda em uma mensagem só, pode ser em tópicos.',
    'Bloco 2 de 3 — Território e saúde\n\n' +
      '4. Município, distrito/povoado e zona (urbana, rural ou periurbana)\n' +
      '5. Número aproximado de famílias e de pessoas\n' +
      '6. Qual serviço de saúde a comunidade usa com mais frequência?\n' +
      '7. Principais problemas de saúde e dificuldades de acesso enfrentados\n\n' +
      'Pode responder o que souber — o que não souber, deixe em branco.',
    'Bloco 3 de 3 — Contato e consentimento\n\n' +
      '8. Nome completo de quem está respondendo e sua função na comunidade\n' +
      '9. Telefone com WhatsApp e (se houver) e-mail\n' +
      '10. Você autoriza a CASPCT/SES-PE a entrar em contato pelos dados informados? (sim/não)\n\n' +
      'Sobre seus dados: as informações são usadas exclusivamente pela CASPCT/SES-PE para planejamento e comunicação em saúde, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Você pode solicitar acesso, correção ou exclusão a qualquer momento.',
  ];

  async function cadastroLite() {
    setAccent(COLORS.verde);
    pendingCollector = { answers: [] };
    await sendCadastroBlock(0);
  }

  async function sendCadastroBlock(index) {
    await botSay(CADASTRO_BLOCKS[index]);
    enableFreeInput(`Resposta ao bloco ${index + 1} de 3...`);
    pendingResolver = async (text) => {
      pendingCollector.answers.push(text);
      if (index < CADASTRO_BLOCKS.length - 1) {
        await sendCadastroBlock(index + 1);
      } else {
        await finishCadastroLite();
      }
    };
  }

  async function finishCadastroLite() {
    const [b1, , b3] = pendingCollector.answers;
    const comunidade = CASPCT.extractLine(b1, 0, 'sua comunidade');
    const nomeRespondente = CASPCT.extractLine(b3, 0, 'você');
    const protocolo = CASPCT.nextProtocol('CAD');

    CASPCT.saveRecord({
      protocolo,
      tipo: 'Cadastro (via chat)',
      nome: nomeRespondente,
      comunidade,
      detalhes: pendingCollector.answers.join('\n\n---\n\n'),
      status: 'Pendente de validação',
    });
    pendingCollector = null;

    await botSay(
      `Cadastro recebido, ${comunidade}! ✅\n\n` +
      `Protocolo: ${protocolo}\n\n` +
      'Sua comunidade passa a integrar o cadastro da CASPCT. A partir de agora vocês podem receber, pelo canal de informações, notícias sobre ações da coordenação, editais, formações e políticas que afetam o território.\n\n' +
      'Para parar de receber a qualquer momento, é só escrever SAIR.\n\n' +
      NOTA_CONTATO
    );
    showQuickReplies([
      { label: 'ⓘ Ativar canal de informações', color: COLORS.mostarda, onClick: flowInformacoes },
      { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
    ]);
  }

  // ---------- 4. Informações / opt-in ----------
  // Fluxo estruturado por etapas: a pessoa escolhe explicitamente o canal
  // de contato (WhatsApp e/ou e-mail) em vez de embutir isso num texto
  // livre — pedido direto de usuárias em teste, que não sabiam como
  // informar o contato preferido.
  async function flowInformacoes() {
    setAccent(COLORS.mostarda);
    await botSay(
      'Para receber informações da coordenação de forma sistemática (ações no território, editais, formações e mudanças em políticas), vamos precisar de alguns dados — leva menos de 1 minuto.\n\n' +
      'Você pode cancelar quando quiser, escrevendo SAIR.\n\n' +
      'Para começar, qual é o seu nome?'
    );
    enableFreeInput('Seu nome...');
    pendingResolver = async (text) => informacoesComunidade({ nome: CASPCT.extractFirstLine(text) });
  }

  async function informacoesComunidade(ctx) {
    await botSay('Comunidade/organização e município?');
    enableFreeInput('Comunidade/organização e município...');
    pendingResolver = async (text) => informacoesCanal({ ...ctx, comunidade: text });
  }

  async function informacoesCanal(ctx) {
    await botSay('Como prefere receber as informações da coordenação?');
    showQuickReplies([
      { label: '📱 WhatsApp', color: COLORS.mostarda, onClick: () => informacoesContato({ ...ctx, canal: 'WhatsApp' }) },
      { label: '📧 E-mail', color: COLORS.mostarda, onClick: () => informacoesContato({ ...ctx, canal: 'E-mail' }) },
      { label: '📱📧 Os dois', color: COLORS.mostarda, onClick: () => informacoesContato({ ...ctx, canal: 'WhatsApp e e-mail' }) },
    ]);
  }

  async function informacoesContato(ctx) {
    const pedido = ctx.canal === 'WhatsApp'
      ? 'Qual o número de WhatsApp (com DDD)?'
      : ctx.canal === 'E-mail'
        ? 'Qual o seu e-mail?'
        : 'Envie o número de WhatsApp (com DDD) e o e-mail, um em cada linha.';
    await botSay(pedido);
    enableFreeInput(ctx.canal === 'E-mail' ? 'seu@email.com' : 'Telefone e/ou e-mail...');
    pendingResolver = async (text) => informacoesConsentimento({ ...ctx, contato: text.trim() });
  }

  async function informacoesConsentimento(ctx) {
    await botSay(
      `Confirma os dados abaixo?\n\n` +
      `Nome: ${ctx.nome}\n` +
      `Comunidade/município: ${ctx.comunidade}\n` +
      `Canal: ${ctx.canal}\n` +
      `Contato: ${ctx.contato}\n\n` +
      'Ao confirmar, você autoriza a CASPCT/SES-PE a enviar informações sobre políticas de saúde, ações e editais para este contato. Você pode cancelar quando quiser, escrevendo SAIR.\n\n' +
      '💡 Se escolheu WhatsApp, salve nosso número na sua agenda — sem isso, as mensagens do canal podem não chegar até você.'
    );
    showQuickReplies([
      { label: '✅ Autorizo', color: COLORS.mostarda, onClick: () => finishInformacoes(ctx) },
      { label: '↩ Cancelar e voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
    ]);
  }

  async function finishInformacoes(ctx) {
    const subscriber = CASPCT.setSubscriber({
      nome: ctx.nome,
      comunidade: ctx.comunidade,
      canal: ctx.canal,
      contato: ctx.contato,
      optIn: true,
      optInDate: CASPCT.nowStr(),
    });

    await botSay(
      `Pronto, ${subscriber.nome}! Você está inscrito(a) no canal de informações da CASPCT. ✅\n\n` +
      `Canal: ${subscriber.canal} (${subscriber.contato})\n` +
      `Registrado em: ${subscriber.optInDate}\n\n` +
      'Você vai receber:\n' +
      '• ações da coordenação no seu território e na sua região\n' +
      '• editais, chamadas públicas e oportunidades\n' +
      '• formações, oficinas e encontros\n' +
      '• mudanças em políticas de saúde que afetam povos e comunidades tradicionais\n\n' +
      'Enviamos, em média, duas mensagens por mês. Para sair, escreva SAIR.'
    );
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  async function handleOptOut() {
    const subscriber = CASPCT.getSubscriber();
    if (subscriber && subscriber.optIn) {
      subscriber.optIn = false;
      subscriber.optOutDate = CASPCT.nowStr();
      CASPCT.setSubscriber(subscriber);
      await botSay(
        `Tudo bem, ${subscriber.nome}. Você não receberá mais mensagens do canal de informações da CASPCT.\n\n` +
        'Este número continua aberto se você quiser solicitar reunião, apresentar demanda ou tirar dúvidas. É só escrever MENU.\n\n' +
        'Se quiser voltar a receber informações, escreva VOLTAR.'
      );
    } else {
      await botSay('Você ainda não estava inscrito(a) no canal de informações. Se quiser se inscrever, digite 4. Para outras opções, digite MENU.');
    }
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  async function handleOptBackIn() {
    const subscriber = CASPCT.getSubscriber();
    if (subscriber && !subscriber.optIn) {
      subscriber.optIn = true;
      subscriber.optInDate = CASPCT.nowStr();
      CASPCT.setSubscriber(subscriber);
      await botSay(`Pronto, ${subscriber.nome}! Você voltou a receber informações da coordenação. Para sair novamente, escreva SAIR.`);
    } else {
      await botSay('Para receber informações da coordenação, digite 4.');
    }
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  // ---------- 5. Ação em andamento ----------
  async function flowAndamento() {
    setAccent(COLORS.azul);
    await botSay(
      'Para consultar uma ação ou pedido em andamento, envie:\n\n' +
      '• o número do protocolo (REU-…, PAU-…, CAD-…, VIG-…, CLI-… ou ART-…), ou\n' +
      '• seu nome + comunidade + assunto tratado'
    );
    enableFreeInput('Número de protocolo ou nome + comunidade...');
    pendingResolver = async (text) => {
      const match = text.match(/(REU|PAU|CAD|OUT|VIG|CLI|ART)-\d{4}-\d{3}/i);
      if (match) {
        const protocolo = match[0].toUpperCase();
        // Consulta a planilha de verdade primeiro (funciona de qualquer
        // aparelho); só cai para o registro local se não achar remotamente.
        const remoto = await CASPCT.lookupProtocolo(protocolo);
        if (remoto) {
          await botSay(
            `Encontramos seu registro:\n\n` +
            `Protocolo: ${remoto.protocolo}\n` +
            `Status: ${remoto.status || 'Em análise'}\n` +
            (remoto.resposta
              ? `\nResposta da equipe:\n${remoto.resposta}\n`
              : '\nAinda sem retorno registrado por aqui — o contato pode vir por telefone/WhatsApp ou e-mail, conforme o que você informou.\n') +
            '\nSe precisar complementar informações, digite MENU e escolha "Outro assunto".'
          );
        } else {
          const record = CASPCT.findRecord(protocolo);
          if (record) {
            await botSay(
              `Encontramos seu registro (salvo neste navegador):\n\n` +
              `Protocolo: ${record.protocolo}\n` +
              `Tipo: ${record.tipo}\n` +
              `Registrado em: ${record.criadoEm}\n` +
              `Status: ${record.status || 'Em análise'}\n\n` +
              'Se precisar complementar informações, digite MENU e escolha "Outro assunto".'
            );
          } else {
            await botSay('Não encontramos esse protocolo. Se você tiver certeza do número, nossa equipe pode consultar a planilha de controle e retornar por telefone/WhatsApp ou e-mail.');
          }
        }
      } else {
        const found = CASPCT.searchRecordsByText(text);
        if (found.length) {
          const list = found.map(r => `• ${r.protocolo} — ${r.tipo} (${r.status || 'Em análise'})`).join('\n');
          await botSay(`Localizamos ${found.length} registro(s) relacionados:\n\n${list}`);
        } else {
          await botSay('Recebemos sua consulta. Nossa equipe vai localizar seu registro e retornar por aqui.');
        }
      }
      showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
    };
  }

  // ---------- 6. Outro assunto ----------
  async function flowOutro({ origem, color } = {}) {
    setAccent(color || COLORS.cinza);
    await botSay(
      'Conte pra gente do que se trata, em uma mensagem. Se puder, informe também seu nome, comunidade/organização e município — assim conseguimos encaminhar melhor.\n\n' +
      'Se for algo que não é da nossa área, indicamos o caminho certo.'
    );
    enableFreeInput('Descreva o assunto...');
    pendingResolver = async (text) => {
      const nome = CASPCT.extractLine(text, 0, 'você');
      const protocolo = CASPCT.nextProtocol('OUT');
      CASPCT.saveRecord({ protocolo, tipo: 'Outro assunto', origem: origem || 'Menu geral', nome, detalhes: text, status: 'Pendente' });
      await botSay(
        `Recebido, ${nome}. Protocolo: ${protocolo}.\n\n` +
        'Nossa equipe vai analisar e, se for o caso, indicar o caminho certo.\n\n' +
        NOTA_CONTATO
      );
      showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
    };
  }

  // ---------- 7. Vigilância em Saúde e Clima ----------
  async function flowVigilancia() {
    setAccent(COLORS.alerta);
    await botSay(
      'Vigilância em Saúde e Clima\n\n' +
      'Use esta opção para notificar agravos de saúde, eventos climáticos (enchente, seca, evento extremo), contaminação ambiental, acidentes de trabalho, falta de acesso a serviços ou situações de violência no seu território.\n\n' +
      '⚠️ Se há risco de vida imediato, ligue 192 (SAMU) ou 199 (Defesa Civil) agora — não espere retorno por aqui.\n\n' +
      'Qual o tipo de situação?'
    );
    showQuickReplies(VIGILANCIA_CATEGORIAS.map(cat => ({
      label: cat.label,
      icon: cat.icon,
      color: COLORS.alerta,
      onClick: () => vigilanciaTerritorio(cat),
    })));
  }

  async function vigilanciaTerritorio(cat) {
    await botSay(
      `Categoria: ${cat.icon} ${cat.label}\n\n` +
      'Agora me conte sobre o território, no máximo de detalhe possível:\n\n' +
      '1. Comunidade / território\n' +
      '2. Município\n' +
      '3. GERES (se souber — senão pode deixar em branco)\n' +
      '4. Quantas pessoas ou famílias estão sendo afetadas, aproximadamente\n\n' +
      'Responda tudo em uma mensagem.'
    );
    enableFreeInput('Comunidade, município, GERES, pessoas afetadas...');
    pendingResolver = async (text) => vigilanciaDescricao(cat, { territorioText: text });
  }

  async function vigilanciaDescricao(cat, ctx) {
    await botSay(
      'Descreva a situação com o máximo de detalhes possível: o que está acontecendo, desde quando, e o que já foi observado ou tentado.'
    );
    enableFreeInput('Descreva a situação...');
    pendingResolver = async (text) => vigilanciaGravidade(cat, { ...ctx, descricao: text });
  }

  async function vigilanciaGravidade(cat, ctx) {
    await botSay('Qual a gravidade percebida da situação?');
    showQuickReplies([
      { label: 'Leve', color: COLORS.alerta, onClick: () => vigilanciaSuporte(cat, { ...ctx, gravidade: 'Leve' }) },
      { label: 'Moderada', color: COLORS.alerta, onClick: () => vigilanciaSuporte(cat, { ...ctx, gravidade: 'Moderada' }) },
      { label: 'Grave', color: COLORS.alerta, onClick: () => vigilanciaSuporte(cat, { ...ctx, gravidade: 'Grave' }) },
      { label: 'Gravíssima — risco de vida', color: COLORS.alerta, onClick: () => vigilanciaSuporte(cat, { ...ctx, gravidade: 'Gravíssima (risco de vida)' }) },
    ]);
  }

  async function vigilanciaSuporte(cat, ctx) {
    await botSay(
      'Qual o nível de suporte que a comunidade precisa com mais urgência agora?\n\n' +
      '(ex.: água potável, resgate, atendimento médico, alimentos, abrigo temporário, orientação técnica, articulação institucional — pode listar mais de um)'
    );
    enableFreeInput('O que a comunidade precisa...');
    pendingResolver = async (text) => vigilanciaContato(cat, { ...ctx, suporte: text });
  }

  async function vigilanciaContato(cat, ctx) {
    await botSay('Por fim, seu nome e um telefone de contato (com WhatsApp), para retorno.');
    enableFreeInput('Nome e telefone...');
    pendingResolver = async (text) => finishVigilancia(cat, { ...ctx, contatoText: text });
  }

  async function finishVigilancia(cat, ctx) {
    const nome = CASPCT.extractLine(ctx.contatoText, 0, 'você');
    const telefone = CASPCT.extractLine(ctx.contatoText, 1, '');
    const comunidade = CASPCT.extractLine(ctx.territorioText, 0, '');
    const municipio = CASPCT.extractLine(ctx.territorioText, 1, '');
    const geres = CASPCT.extractLine(ctx.territorioText, 2, '');
    const afetados = CASPCT.extractLine(ctx.territorioText, 3, '');

    const prefixo = cat.sheet === 'mudancas_climaticas' ? 'CLI' : 'VIG';
    const protocolo = CASPCT.nextProtocol(prefixo);
    const descricaoCompleta = ctx.descricao + (ctx.suporte ? `\n\nSuporte necessário: ${ctx.suporte}` : '');

    CASPCT.saveRecord({
      sheet: cat.sheet,
      protocolo,
      tipo: `Vigilância — ${cat.label}`,
      origem: 'Menu geral',
      categoria: cat.categoria,
      tipoEvento: cat.categoria,
      territorio: comunidade,
      comunidade,
      municipio,
      geres,
      afetados,
      gravidade: ctx.gravidade,
      descricao: descricaoCompleta,
      detalhes: descricaoCompleta,
      nome,
      telefone,
      prazo: cat.prazo,
      listaOperacao: cat.lista,
      status: 'Pendente',
    });

    await botSay(
      `Notificação registrada. ✅\n\n` +
      `Protocolo: ${protocolo}\n` +
      `Categoria: ${cat.icon} ${cat.label}\n` +
      `Gravidade percebida: ${ctx.gravidade}\n\n` +
      `Segundo o desenho do projeto, essa categoria aciona: ${cat.lista}, com prazo de resposta de ${cat.prazo}.\n` +
      '(Neste protótipo, o registro fica salvo na planilha de acompanhamento da CASPCT — o envio automático para cada órgão ainda não está implementado.)\n\n' +
      NOTA_CONTATO + '\n\n' +
      '⚠️ Se há risco de vida imediato, ligue 192 (SAMU) ou 199 (Defesa Civil) agora — não espere retorno por aqui.'
    );
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  // ---------- 8. Entre Redes: articulação com outras políticas e públicos ----------
  async function flowArticulacao() {
    setAccent(COLORS.azul);
    await botSay(
      'Entre Redes — Articulação com outras políticas e públicos\n\n' +
      'A saúde de povos e comunidades tradicionais atravessa vários públicos e políticas — pessoas idosas, crianças, mulheres, população negra, LGBTQIAPN+, pessoas com deficiência e outras. Esta opção existe para você indicar quando sua demanda toca especificamente uma dessas políticas, para a coordenação articular com a área certa sem perder o olhar do território.\n\n' +
      'Escolha a política ou público relacionado à sua demanda:'
    );
    showQuickReplies(ARTICULACAO_CATEGORIAS.map(cat => ({
      label: cat.label,
      icon: cat.icon,
      color: COLORS.azul,
      onClick: () => articulacaoExplicar(cat),
    })));
  }

  async function articulacaoExplicar(cat) {
    await botSay(`${cat.icon} ${cat.label}\n\n${cat.explicacao}`);
    await botSay(
      cat.pergunta ||
      'Conte sua demanda ou situação, incluindo comunidade/território, município e um contato (nome e telefone).'
    );
    enableFreeInput('Descreva a demanda...');
    pendingResolver = async (text) => finishArticulacao(cat, text);
  }

  async function finishArticulacao(cat, text) {
    const nome = CASPCT.extractLine(text, 0, 'você');
    const protocolo = CASPCT.nextProtocol('ART');
    CASPCT.saveRecord({
      sheet: 'articulacao',
      protocolo,
      tipo: `Entre Redes — ${cat.label}`,
      origem: 'Menu geral',
      categoria: cat.label,
      politica: cat.politica,
      nome,
      detalhes: text,
      status: 'Pendente',
    });
    await botSay(
      `Registrado. ✅\n\n` +
      `Protocolo: ${protocolo}\n\n` +
      `Sua demanda foi marcada para articulação com: ${cat.politica}.\n` +
      'A coordenação vai analisar e conectar com a área responsável, mantendo o olhar de povos e comunidades tradicionais em todo o processo.\n\n' +
      NOTA_CONTATO
    );
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  // ---------- blocos auxiliares ----------
  async function showGeres() {
    await botSay(
      'Essa demanda pode precisar ser tratada junto à GERES (Gerência Regional de Saúde) responsável pelo seu município, que é a referência regional para o seu território.\n\n' +
      'A CASPCT identifica a GERES correspondente, encaminha internamente e acompanha o retorno. Se não houver retorno em um prazo razoável, nos avise por aqui digitando MENU e depois 2 (Pauta/demanda).'
    );
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  async function showUrgencia() {
    setAccent(COLORS.terracota);
    await botSay(
      'Este canal é da coordenação de políticas de saúde e não realiza atendimento clínico nem agendamento de consultas.\n\n' +
      '• Emergência: 192 (SAMU) ou UPA mais próxima\n' +
      '• Consultas e exames: procure a Unidade Básica de Saúde do seu território\n' +
      '• Ouvidoria SUS: 136\n\n' +
      'Se a dificuldade de acesso ao serviço é um problema recorrente na sua comunidade, isso é pauta nossa — digite 2 e registre.',
      { system: false }
    );
    showQuickReplies([
      { label: '📣 Registrar como pauta/demanda', color: COLORS.terracota, onClick: flowPauta },
      { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
    ]);
  }

  async function showOficio() {
    await botSay(
      'Solicitações que exigem resposta formal em ofício devem ser encaminhadas por escrito ao e-mail institucional da CASPCT/SES-PE, com identificação da organização.\n\n' +
      'Podemos registrar o pedido por aqui também, para acompanhamento — mas a resposta oficial sai pelo canal formal.'
    );
    showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
  }

  // ---------- acessibilidade (19.) ----------
  const root = document.documentElement;
  let fontStep = 0;
  document.getElementById('font-increase').addEventListener('click', () => {
    fontStep = Math.min(fontStep + 1, 4);
    root.style.setProperty('--base-font-size', (16 + fontStep * 2) + 'px');
  });
  document.getElementById('font-decrease').addEventListener('click', () => {
    fontStep = Math.max(fontStep - 1, -2);
    root.style.setProperty('--base-font-size', (16 + fontStep * 2) + 'px');
  });
  document.getElementById('contrast-toggle').addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
  });

  // Botão fixo no topo — sempre visível, não depende de rolar o chat ou
  // lembrar de digitar MENU (pedido de usuárias em teste).
  document.getElementById('menu-btn').addEventListener('click', () => {
    pendingResolver = null;
    pendingCollector = null;
    disableFreeInput();
    showMainMenu();
  });

  // ---------- início ----------
  start();
})();
