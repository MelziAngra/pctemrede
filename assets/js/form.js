/* ===========================================================
   Formulário de Cadastro — CASPCT/SES-PE
   Validação client-side, geração de protocolo e envio local
   (sem backend — registro salvo no localStorage do navegador).
   =========================================================== */

(() => {
  // Lista de apoio (não exaustiva) de municípios de Pernambuco, para autocomplete.
  const MUNICIPIOS_PE = [
    'Abreu e Lima', 'Afogados da Ingazeira', 'Afrânio', 'Agrestina', 'Água Preta', 'Águas Belas',
    'Alagoinha', 'Aliança', 'Altinho', 'Amaraji', 'Angelim', 'Araçoiaba', 'Araripina',
    'Arcoverde', 'Barra de Guabiraba', 'Barreiros', 'Belém de Maria', 'Belém do São Francisco',
    'Belo Jardim', 'Betânia', 'Bezerros', 'Bodocó', 'Bom Conselho', 'Bom Jardim', 'Bonito',
    'Brejão', 'Brejinho', 'Brejo da Madre de Deus', 'Buenos Aires', 'Buíque',
    'Cabo de Santo Agostinho', 'Cabrobó', 'Cachoeirinha', 'Caetés', 'Calçado', 'Calumbi',
    'Camaragibe', 'Camocim de São Félix', 'Camutanga', 'Canhotinho', 'Capoeiras', 'Carnaíba',
    'Carnaubeira da Penha', 'Carpina', 'Caruaru', 'Casinhas', 'Catende', 'Cedro',
    'Chã de Alegria', 'Chã Grande', 'Condado', 'Correntes', 'Cortês', 'Cumaru', 'Cupira',
    'Custódia', 'Dormentes', 'Escada', 'Exu', 'Feira Nova', 'Fernando de Noronha', 'Ferreiros',
    'Flores', 'Floresta', 'Frei Miguelinho', 'Gameleira', 'Garanhuns', 'Glória do Goitá',
    'Goiana', 'Granito', 'Gravatá', 'Iati', 'Ibimirim', 'Ibirajuba', 'Igarassu', 'Iguaraci',
    'Inajá', 'Ipojuca', 'Ipubi', 'Itacuruba', 'Itaíba', 'Itamaracá', 'Itambé', 'Itapetim',
    'Itapissuma', 'Itaquitinga', 'Jaboatão dos Guararapes', 'Jaqueira', 'Jataúba', 'Jatobá',
    'João Alfredo', 'Joaquim Nabuco', 'Jucati', 'Jupi', 'Jurema', 'Lagoa do Carro',
    'Lagoa do Itaenga', 'Lagoa do Ouro', 'Lagoa dos Gatos', 'Lagoa Grande', 'Lajedo', 'Limoeiro',
    'Macaparana', 'Machados', 'Manari', 'Maraial', 'Mirandiba', 'Moreno', 'Nazaré da Mata',
    'Olinda', 'Orobó', 'Orocó', 'Ouricuri', 'Palmares', 'Palmeirina', 'Panelas', 'Paranatama',
    'Parnamirim', 'Passira', 'Paudalho', 'Paulista', 'Pedra', 'Pesqueira', 'Petrolândia',
    'Petrolina', 'Poção', 'Pombos', 'Primavera', 'Quipapá', 'Quixaba', 'Recife',
    'Riacho das Almas', 'Ribeirão', 'Rio Formoso', 'Sairé', 'Salgadinho', 'Salgueiro',
    'Saloá', 'Sanharó', 'Santa Cruz', 'Santa Cruz da Baixa Verde', 'Santa Cruz do Capibaribe',
    'Santa Filomena', 'Santa Maria da Boa Vista', 'Santa Maria do Cambucá', 'Santa Terezinha',
    'São Benedito do Sul', 'São Bento do Una', 'São Caitano', 'São João', 'São Joaquim do Monte',
    'São José da Coroa Grande', 'São José do Belmonte', 'São José do Egito',
    'São Lourenço da Mata', 'São Vicente Férrer', 'Serra Talhada', 'Serrita', 'Sertânia',
    'Sirinhaém', 'Solidão', 'Surubim', 'Tabira', 'Tacaimbó', 'Tacaratu', 'Tamandaré',
    'Taquaritinga do Norte', 'Terezinha', 'Terra Nova', 'Timbaúba', 'Toritama', 'Tracunhaém',
    'Trindade', 'Triunfo', 'Tupanatinga', 'Tuparetama', 'Venturosa', 'Verdejante',
    'Vertente do Lério', 'Vertentes', 'Vicência', 'Vitória de Santo Antão', 'Xexéu',
  ];

  const datalist = document.getElementById('municipios-pe');
  MUNICIPIOS_PE.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    datalist.appendChild(opt);
  });

  const formEl = document.getElementById('cad-form');
  const errorBanner = document.getElementById('form-error');

  // habilita/desabilita campos "outro" conforme o rádio/checkbox correspondente
  document.querySelectorAll('[data-other-for]').forEach(trigger => {
    const target = document.getElementById(trigger.dataset.otherFor);
    trigger.addEventListener('change', () => {
      if (trigger.type === 'radio') {
        const group = document.getElementsByName(trigger.name);
        group.forEach(input => {
          const otherTarget = input.dataset.otherFor && document.getElementById(input.dataset.otherFor);
          if (otherTarget && otherTarget !== target) { otherTarget.disabled = true; otherTarget.value = ''; }
        });
      }
      target.disabled = !trigger.checked;
      if (!trigger.checked) target.value = '';
      else target.focus();
    });
  });

  function checkboxGroupValue(name) {
    return Array.from(document.getElementsByName(name))
      .filter(el => el.checked)
      .map(el => el.value);
  }

  function validateRequiredCheckboxGroups() {
    let ok = true;
    document.querySelectorAll('[data-required-checkbox]').forEach(group => {
      const name = group.dataset.requiredCheckbox;
      const checked = checkboxGroupValue(name);
      const errorEl = document.querySelector(`[data-error-for="${name}"]`);
      const max = group.dataset.max ? parseInt(group.dataset.max, 10) : null;
      const invalid = checked.length === 0 || (max && checked.length > max);
      if (errorEl) errorEl.classList.toggle('visible', invalid);
      if (invalid) ok = false;
    });
    return ok;
  }

  function collectFormData() {
    const data = {};
    new FormData(formEl).forEach((value, key) => {
      if (data[key] === undefined) data[key] = value;
      else if (Array.isArray(data[key])) data[key].push(value);
      else data[key] = [data[key], value];
    });
    return data;
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBanner.classList.remove('visible');
    errorBanner.textContent = '';

    const nativeValid = formEl.checkValidity();
    const checkboxesValid = validateRequiredCheckboxGroups();

    if (!nativeValid || !checkboxesValid) {
      errorBanner.textContent = 'Confira os campos obrigatórios (marcados com *) — alguns ainda precisam de resposta.';
      errorBanner.classList.add('visible');
      formEl.reportValidity();
      return;
    }

    const data = collectFormData();
    const comunidade = data.q1_1 || 'sua comunidade';
    const respondente = data.q7_1 || 'você';
    const protocolo = CASPCT.nextProtocol('CAD');

    CASPCT.saveRecord({
      protocolo,
      tipo: 'Cadastro (formulário completo)',
      nome: respondente,
      comunidade,
      municipio: data.q2_1 || '',
      telefone: data.q7_3 || '',
      optInInformativo: !!data.q8_2,
      status: 'Pendente de validação',
      detalhes: data,
    });

    if (data.q8_2) {
      CASPCT.setSubscriber({
        nome: respondente,
        comunidade,
        optIn: true,
        optInDate: CASPCT.nowStr(),
      });
    }

    formEl.hidden = true;
    document.querySelector('.section-nav').hidden = true;
    const panel = document.getElementById('success-panel');
    document.getElementById('success-protocol').textContent = `Protocolo: ${protocolo}`;
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
