const $ = id => document.getElementById(id);
const ABAS = ['fluxo', 'movimentacoes'];
const carregadas = new Set(); 

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ROTULO_ENTRADA = {
    'Dinheiro': 'Vendas em dinheiro (caixa)',
    'PIX': 'Vendas por PIX (banco)',
    'Crédito': 'Vendas no cartão de crédito (banco)',
    'Débito': 'Vendas no cartão de débito (banco)',
};

function mostrarAba(nome) {
    if (!ABAS.includes(nome)) nome = 'fluxo';
    ABAS.forEach(a => { 
        const el = $(`tab-${a}`);
        if (el) el.hidden = a !== nome; 
    });

    document.querySelectorAll('.tab-btn').forEach(b => {
        const ativa = b.dataset.aba === nome;
        b.classList.toggle('active', ativa);
        b.setAttribute('aria-selected', ativa);
    });

    history.replaceState(null, '', `relatorios.html?aba=${nome}`);

    const subItensRelatorio = document.querySelectorAll('.sidebar .item-sub-relatorio');
    subItensRelatorio.forEach(li => {
        const link = li.querySelector('a');
        if (link) {
            const ehSubAba = link.href.includes(`aba=${nome}`);
            li.classList.toggle('active', ehSubAba);
        }
    });

    if (!carregadas.has(nome)) {
        carregadas.add(nome);
        if (nome === 'fluxo') carregarFluxo();
        if (nome === 'movimentacoes') carregarMovimentacoes();
    }
}

/* ---------- Fluxo de caixa diário ---------- */
async function carregarFluxo() {
    const mes = $('select-mes-fluxo')?.value || '';
    const ano = $('select-ano-fluxo')?.value || '';
    const res = await apiRequest(`/relatorios/fluxo-caixa${mes && ano ? `?mes=${mes}&ano=${ano}` : ''}`);
    if (!res) return;

    if ($('select-ano-fluxo')) {
        $('select-ano-fluxo').innerHTML = res.anos.map(a => `<option value="${a}" ${a === res.ano ? 'selected' : ''}>${a}</option>`).join('');
    }
    if ($('select-mes-fluxo')) {
        $('select-mes-fluxo').value = res.mes;
    }
    renderizarFluxo(res);
}

function renderizarFluxo(res) {
    const totalDias = res.dias.length;

    $('th-fluxo').innerHTML =
        '<tr><th class="sticky-col">FLUXO DE CAIXA</th>' +
        res.dias.map(d => `<th class="num">${d.dia}-${MESES_CURTOS[res.mes - 1]}</th>`).join('') +
        '<th class="num sticky-col-right">Total do mês</th></tr>';

    const linha = (rotulo, extrair, { classe = '', traco = false, sinal = false } = {}) => {
        const celulasDias = res.dias.map(d => {
            const v = extrair(d);
            if (d.sem_dados || v === null || v === undefined) return '<td class="num futuro">-</td>';
            const texto = traco && v === 0 ? '-' : formatarMoeda(v);
            return `<td class="num ${sinal && v < 0 ? 'neg' : ''}">${texto}</td>`;
        }).join('');

        const vResumo = extrair(res.resumo);
        const textoResumo = (res.resumo.sem_dados || vResumo === null || vResumo === undefined) 
            ? '-' 
            : (traco && vResumo === 0 ? '-' : formatarMoeda(vResumo));
        
        const celulaTotal = `<td class="num ${sinal && vResumo < 0 ? 'neg' : ''} sticky-col-right">${textoResumo}</td>`;

        return `<tr class="${classe}"><td class="sticky-col">${escapeHtml(rotulo)}</td>${celulasDias}${celulaTotal}</tr>`;
    };

    const faixa = titulo =>
        `<tr class="linha-faixa"><td class="sticky-col">${escapeHtml(titulo)}</td><td colspan="${totalDias}"></td><td class="sticky-col-right"></td></tr>`;

    const blocoSaldo = (titulo, conta, rotuloEntrada, rotuloSaida, rotuloFinal) => [
        faixa(titulo),
        linha('Saldo inicial', c => c[`${conta}_saldo_inicial`], { classe: 'linha-sub', sinal: true }),
        linha(rotuloEntrada, c => c[`${conta}_entradas`], { classe: 'linha-sub', traco: true }),
        linha(rotuloSaida, c => c[`${conta}_saidas`], { classe: 'linha-sub', traco: true }),
        linha(rotuloFinal, c => c[`${conta}_saldo_final`], { classe: 'linha-subtotal', sinal: true }),
    ];

    $('tb-fluxo-body').innerHTML = [
        linha('SALDO INICIAL (caixa + banco)', c => c.saldo_inicial, { classe: 'linha-total', sinal: true }),
        linha('SALDO OPERACIONAL', c => c.saldo_operacional, { classe: 'linha-total', sinal: true }),
        linha('SALDO FINAL (caixa + banco)', c => c.saldo_final, { classe: 'linha-saldo-final', sinal: true }),
        linha('TOTAL DE ENTRADAS', c => c.total_entradas, { classe: 'linha-total linha-separador' }),
        ...res.formas.map(f => linha(ROTULO_ENTRADA[f] || f, c => c.entradas[f], { classe: 'linha-sub', traco: true })),
        linha('TOTAL DE SAÍDAS', c => c.total_saidas, { classe: 'linha-total linha-separador' }),
        ...res.categorias.map(cat => linha(cat, c => c.saidas[cat], { classe: 'linha-sub', traco: true })),
        ...blocoSaldo('EM CAIXA (DINHEIRO)', 'caixa', '(+) Vendas em dinheiro', '(−) Saídas pagas em dinheiro', 'Saldo final em caixa'),
        ...blocoSaldo('NO BANCO (PIX E CARTÕES)', 'banco', '(+) Vendas por PIX e cartões', '(−) Saídas pagas por PIX e cartão', 'Saldo final no banco'),
    ].join('');
}

/* ---------- Histórico de movimentações ---------- */
function periodo(idInicio, idFim) {
    const params = new URLSearchParams();
    if ($(idInicio)?.value) params.set('inicio', $(idInicio).value);
    if ($(idFim)?.value) params.set('fim', $(idFim).value);
    const texto = params.toString();
    return texto ? `?${texto}` : '';
}

async function carregarMovimentacoes() {
    const lista = await apiRequest(`/relatorios/movimentacoes${periodo('mov-inicio', 'mov-fim')}`);
    if (!lista) return;

    $('tb-mov-body').innerHTML = lista.length === 0
        ? '<tr><td colspan="5" class="vazio">Nenhuma movimentação no período.</td></tr>'
        : lista.map(m => {
            const entrada = m.tipo === 'Entrada';
            return `
            <tr>
                <td><strong class="tipo-mov ${entrada ? 'pos' : 'neg'}">${icone(entrada ? 'seta-cima' : 'seta-baixo', 'icone-sm')} ${entrada ? 'Entrada' : 'Saída'}</strong></td>
                <td>${formatarDataHora(m.data)}</td>
                <td style="white-space:normal">${escapeHtml(m.descricao || '-')}</td>
                <td>${escapeHtml(m.forma_pagamento)}</td>
                <td class="num ${entrada ? 'pos' : 'neg'}"><strong>${entrada ? '' : '- '}${formatarMoeda(m.valor)}</strong></td>
            </tr>`;
        }).join('');

    const entradas = lista.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.valor, 0);
    const saidas = lista.filter(m => m.tipo !== 'Entrada').reduce((s, m) => s + m.valor, 0);
    const saldo = entradas - saidas;
    $('tf-mov').innerHTML = lista.length
        ? `<tr><td colspan="4">${lista.length} movimentação(ões) · Entradas ${formatarMoeda(entradas)} · Saídas ${formatarMoeda(saidas)}</td><td class="num ${saldo < 0 ? 'neg' : ''}">${formatarMoeda(saldo)}</td></tr>`
        : '';
}

/* ---------- Restauração de fábrica ---------- */
async function restaurarSistema() {
    const senha = await pedirSenha(
        'Isso apaga TODAS as vendas, saídas, caixas e produtos, e recria os 39 produtos iniciais com o estoque de partida.\nDigite sua senha para confirmar.',
        { textoOk: 'Restaurar', perigo: true }
    );
    if (senha === null) return;
    const res = await apiRequest('/admin/restaurar-fabrica', 'POST', { senha });
    if (res?.sucesso) {
        toast('Sistema restaurado e pronto para uso.', 'sucesso');
        setTimeout(() => { location.href = 'inicio.html'; }, 1200);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const agora = new Date();
    const hoje = dataISO();
    const inicioMes = dataISO(new Date(agora.getFullYear(), agora.getMonth(), 1));
    
    if ($('mov-inicio')) $('mov-inicio').value = inicioMes;
    if ($('mov-fim')) $('mov-fim').value = hoje;

    if ($('select-mes-fluxo')) {
        $('select-mes-fluxo').innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
        $('select-mes-fluxo').value = agora.getMonth() + 1;
        $('select-mes-fluxo').addEventListener('change', carregarFluxo);
    }

    if ($('select-ano-fluxo')) {
        $('select-ano-fluxo').addEventListener('change', carregarFluxo);
    }

    document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => mostrarAba(b.dataset.aba)));
    
    if ($('btn-filtrar-mov')) {
        $('btn-filtrar-mov').addEventListener('click', carregarMovimentacoes);
    }

    if (typeof Sessao !== 'undefined' && Sessao.cargo() === 'GERENTE') {
        if ($('area-gerente')) $('area-gerente').hidden = false;
        if ($('btn-restaurar')) $('btn-restaurar').addEventListener('click', restaurarSistema);
    }
    
    mostrarAba(new URLSearchParams(location.search).get('aba') || 'fluxo');
});