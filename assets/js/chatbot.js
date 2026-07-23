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
  const COLORS = {
    verde: '#2F5D50',
    terracota: '#C56A3D',
    mostarda: '#D89B2D',
    azul: '#1F5EA8',
    cinza: '#6B6B6B',
  };

  const MENU_OPTIONS = [
    { key: '1', cmd: '/reuniao', title: 'Solicitar reunião', sub: 'com a coordenação', icon: '🗓️', color: COLORS.azul, run: flowReuniao },
    { key: '2', cmd: '/pauta', title: 'Apresentar pauta ou demanda', sub: '', icon: '📣', color: COLORS.terracota, run: flowPauta },
    { key: '3', cmd: '/cadastro', title: 'Cadastrar minha comunidade', sub: '', icon: '⌂', color: COLORS.verde, run: flowCadastro },
    { key: '4', cmd: '/informacoes', title: 'Receber informações da coordenação', sub: '', icon: 'ⓘ', color: COLORS.mostarda, run: flowInformacoes },
    { key: '5', cmd: '/andamento', title: 'Falar sobre uma ação já em andamento', sub: '', icon: '→', color: COLORS.azul, run: flowAndamento },
    { key: '6', cmd: '/outro', title: 'Outro assunto', sub: '', icon: '💬', color: COLORS.cinza, run: flowOutro },
  ];

  const URGENCY_WORDS = ['emergência', 'emergencia', 'infarto', 'socorro', 'passando mal', 'sangrando', 'convulsão', 'convulsao', 'engasg'];

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
      '4 Receber informações · 5 Ação em andamento · 6 Outro assunto\n\n' +
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
        'Enquanto isso: sua comunidade já está cadastrada conosco? Se ainda não, toque em "Cadastrar" — o cadastro ajuda a coordenação a planejar ações no seu território.'
      );
      showQuickReplies([
        { label: '⌂ Cadastrar minha comunidade', color: COLORS.verde, onClick: flowCadastro },
        { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
      ]);
    };
  }

  // ---------- 2. Pauta / demanda ----------
  async function flowPauta() {
    setAccent(COLORS.terracota);
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
      CASPCT.saveRecord({ protocolo, tipo: 'Pauta/Demanda', nome, detalhes: text, status: 'Pendente' });

      await botSay(
        `Demanda registrada, ${nome}.\n\n` +
        `Protocolo: ${protocolo}\n` +
        `Registrado em: ${CASPCT.nowStr()}\n\n` +
        'A coordenação vai analisar e encaminhar internamente. Você receberá retorno sobre o andamento.\n\n' +
        'ℹ️ Importante: a CASPCT atua na formulação e no acompanhamento de políticas. Algumas demandas precisam ser encaminhadas à GERES da sua região ou à secretaria municipal — quando for o caso, informamos o caminho e acompanhamos.'
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
      'Para parar de receber a qualquer momento, é só escrever SAIR.'
    );
    showQuickReplies([
      { label: 'ⓘ Ativar canal de informações', color: COLORS.mostarda, onClick: flowInformacoes },
      { label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu },
    ]);
  }

  // ---------- 4. Informações / opt-in ----------
  async function flowInformacoes() {
    setAccent(COLORS.mostarda);
    await botSay(
      'Para receber informações da coordenação de forma sistemática, precisamos de três coisas:\n\n' +
      '1. Seu nome\n' +
      '2. Comunidade/organização e município\n' +
      '3. Confirmação: você autoriza a CASPCT/SES-PE a enviar informações sobre políticas de saúde, ações e editais para este número?\n\n' +
      'Responda AUTORIZO junto com os dados acima.\n\n' +
      'Você pode cancelar quando quiser, escrevendo SAIR.\n\n' +
      '💡 Salve nosso número na sua agenda — sem isso, as mensagens do canal podem não chegar até você.'
    );
    enableFreeInput('Nome, comunidade/município e AUTORIZO...');
    pendingResolver = handleInformacoesReply;
  }

  async function handleInformacoesReply(text) {
    if (!/autorizo/i.test(text)) {
      await botSay('Para concluir a inscrição, inclua a palavra AUTORIZO junto com seu nome e comunidade/município. Se preferir não se inscrever agora, digite MENU.');
      enableFreeInput('Nome, comunidade/município e AUTORIZO...');
      pendingResolver = handleInformacoesReply;
      return;
    }
    const nome = CASPCT.extractLine(text, 0, 'você');
    const comunidade = CASPCT.extractLine(text, 1, '');
    const subscriber = CASPCT.setSubscriber({ nome, comunidade, optIn: true, optInDate: CASPCT.nowStr() });

    await botSay(
      `Pronto, ${subscriber.nome}! Você está inscrito(a) no canal de informações da CASPCT. ✅\n\n` +
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
      '• o número do protocolo (REU-…, PAU-… ou CAD-…), ou\n' +
      '• seu nome + comunidade + assunto tratado'
    );
    enableFreeInput('Número de protocolo ou nome + comunidade...');
    pendingResolver = async (text) => {
      const match = text.match(/(REU|PAU|CAD|OUT)-\d{4}-\d{3}/i);
      if (match) {
        const record = CASPCT.findRecord(match[0]);
        if (record) {
          await botSay(
            `Encontramos seu registro:\n\n` +
            `Protocolo: ${record.protocolo}\n` +
            `Tipo: ${record.tipo}\n` +
            `Registrado em: ${record.criadoEm}\n` +
            `Status: ${record.status || 'Em análise'}\n\n` +
            'Se precisar complementar informações, digite MENU e escolha "Outro assunto".'
          );
        } else {
          await botSay('Não encontramos esse protocolo nos registros deste protótipo. Em um atendimento real, nossa equipe consultaria a planilha de controle e retornaria por aqui.');
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
  async function flowOutro() {
    setAccent(COLORS.cinza);
    await botSay(
      'Conte pra gente do que se trata, em uma mensagem. Se puder, informe também seu nome, comunidade/organização e município — assim conseguimos encaminhar melhor.\n\n' +
      'Se for algo que não é da nossa área, indicamos o caminho certo.'
    );
    enableFreeInput('Descreva o assunto...');
    pendingResolver = async (text) => {
      const nome = CASPCT.extractLine(text, 0, 'você');
      const protocolo = CASPCT.nextProtocol('OUT');
      CASPCT.saveRecord({ protocolo, tipo: 'Outro assunto', nome, detalhes: text, status: 'Pendente' });
      await botSay(
        `Recebido, ${nome}. Protocolo: ${protocolo}.\n\n` +
        'Nossa equipe vai analisar e, se for o caso, indicar o caminho certo.'
      );
      showQuickReplies([{ label: '↩ Voltar ao menu', color: COLORS.cinza, onClick: showMainMenu }]);
    };
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

  // ---------- início ----------
  start();
})();
