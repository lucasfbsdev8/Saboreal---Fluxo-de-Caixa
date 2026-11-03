const $ = id => document.getElementById(id);
const ABAS = ['fluxo', 'vendas', 'produtos'];
const carregadas = new Set();   // cada aba só busca dados na primeira vez que é aberta

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
    ABAS.forEach(a => { $(`tab-${a}`).hidden = a !== nome; });
    document.querySelectorAll('.tab-btn').forEach(b => {
        const ativa = b.dataset.aba === nome;
        b.classList.toggle('active', ativa);
        b.setAttribute('aria-selected', ativa);
    });
    if (!carregadas.has(nome)) {
        carregadas.add(nome);
        ({ fluxo: carregarFluxo, vendas: carregarVendas, produtos: carregarTop })[nome]();
    }
}

/* ---------- Fluxo de caixa diário ---------- */
async function carregarFluxo() {
    const mes = $('select-mes-fluxo').value;
    const ano = $('select-ano-fluxo').value;
    const res = await apiRequest(`/relatorios/fluxo-caixa${mes && ano ? `?mes=${mes}&ano=${ano}` : ''}`);
    if (!res) return;

    $('select-ano-fluxo').innerHTML = res.anos.map(a => `<option value="${a}" ${a === res.ano ? 'selected' : ''}>${a}</option>`).join('');
    $('select-mes-fluxo').value = res.mes;
    renderizarFluxo(res);
}

function renderizarFluxo(res) {
    const colunas = [...res.dias, res.resumo];   // última coluna = total do mês

    $('th-fluxo').innerHTML =
        '<tr><th class="sticky-col">FLUXO DE CAIXA</th>' +
        res.dias.map(d => `<th class="num">${d.dia}-${MESES_CURTOS[res.mes - 1]}</th>`).join('') +
        '<th class="num">Total do mês</th></tr>';

    // extrair(coluna) -> valor em centavos; traco: mostra "-" quando for zero; sinal: negativo em vermelho
    const linha = (rotulo, extrair, { classe = '', traco = false, sinal = false } = {}) => {
        const celulas = colunas.map(c => {
            const v = extrair(c);
            if (c.sem_dados || v === null || v === undefined) return '<td class="num futuro">-</td>';   // dia que ainda não chegou
            const texto = traco && v === 0 ? '-' : formatarMoeda(v);
            return `<td class="num ${sinal && v < 0 ? 'neg' : ''}">${texto}</td>`;
        }).join('');
        return `<tr class="${classe}"><td class="sticky-col">${escapeHtml(rotulo)}</td>${celulas}</tr>`;
    };

    // Faixa de título que separa os blocos da tabela.
    const faixa = titulo =>
        `<tr class="linha-faixa"><td class="sticky-col">${escapeHtml(titulo)}</td><td colspan="${colunas.length}"></td></tr>`;

    // Bloco de saldo: saldo inicial, movimento e saldo final de uma das contas ('caixa' ou 'banco').
    const blocoSaldo = (titulo, conta, rotuloEntrada, rotuloSaida, rotuloFinal) => [
        faixa(titulo),
        linha('Saldo inicial', c => c[`${conta}_saldo_inicial`], { classe: 'linha-sub', sinal: true }),
        linha(rotuloEntrada, c => c[`${conta}_entradas`], { classe: 'linha-sub', traco: true }),
        linha(rotuloSaida, c => c[`${conta}_saidas`], { classe: 'linha-sub', traco: true }),
        linha(rotuloFinal, c => c[`${conta}_saldo_final`], { classe: 'linha-subtotal', sinal: true }),
    ];

    $('tb-fluxo-body').innerHTML = [
        linha('TOTAL DE ENTRADAS', c => c.total_entradas, { classe: 'linha-total' }),
        ...res.formas.map(f => linha(ROTULO_ENTRADA[f] || f, c => c.entradas[f], { classe: 'linha-sub', traco: true })),
        linha('TOTAL DE SAÍDAS', c => c.total_saidas, { classe: 'linha-total linha-separador' }),
        ...res.categorias.map(cat => linha(cat, c => c.saidas[cat], { classe: 'linha-sub', traco: true })),
        linha('SALDO OPERACIONAL', c => c.saldo_operacional, { classe: 'linha-total linha-separador', sinal: true }),
        ...blocoSaldo('EM CAIXA (DINHEIRO)', 'caixa', '(+) Vendas em dinheiro', '(−) Saídas pagas em dinheiro', 'Saldo final em caixa'),
        ...blocoSaldo('NO BANCO (PIX E CARTÕES)', 'banco', '(+) Vendas por PIX e cartões', '(−) Saídas pagas por PIX e cartão', 'Saldo final no banco'),
        linha('SALDO INICIAL (caixa + banco)', c => c.saldo_inicial, { classe: 'linha-total linha-separador', sinal: true }),
        linha('SALDO FINAL (caixa + banco)', c => c.saldo_final, { classe: 'linha-saldo-final', sinal: true }),
    ].join('');}

/* ---------- Histórico de vendas e mais vendidos ---------- */
function periodo(idInicio, idFim) {
    const params = new URLSearchParams();
    if ($(idInicio).value) params.set('inicio', $(idInicio).value);
    if ($(idFim).value) params.set('fim', $(idFim).value);
    const texto = params.toString();
    return texto ? `?${texto}` : '';
}

async function carregarVendas() {
    const vendas = await apiRequest(`/relatorios/vendas-detalhado${periodo('vendas-inicio', 'vendas-fim')}`);
    if (!vendas) return;

    $('tb-vendas-body').innerHTML = vendas.length === 0
        ? '<tr><td colspan="5" class="vazio">Nenhuma venda no período.</td></tr>'
        : vendas.map(v => `
            <tr>
                <td>#${v.id}</td>
                <td>${formatarDataHora(v.data_venda)}</td>
                <td style="white-space:normal">${escapeHtml(v.descricao_itens || '-')}</td>
                <td>${escapeHtml(v.forma_pagamento)}</td>
                <td class="num"><strong>${formatarMoeda(v.total)}</strong></td>
            </tr>`).join('');

    const soma = vendas.reduce((s, v) => s + v.total, 0);
    $('tf-vendas').innerHTML = vendas.length
        ? `<tr><td colspan="4">${vendas.length} venda(s) no período</td><td class="num">${formatarMoeda(soma)}</td></tr>`
        : '';
}

async function carregarTop() {
    const tops = await apiRequest(`/relatorios/top-produtos${periodo('top-inicio', 'top-fim')}`);
    if (!tops) return;
    $('tb-top-produtos').innerHTML = tops.length === 0
        ? '<tr><td colspan="4" class="vazio">Nenhum produto vendido no período.</td></tr>'
        : tops.map(p => `
            <tr>
                <td>${escapeHtml(p.codigo)}</td>
                <td><strong>${escapeHtml(p.nome)}</strong></td>
                <td class="num">${p.total_vendido} un.</td>
                <td class="num pos"><strong>${formatarMoeda(p.faturamento_total)}</strong></td>
            </tr>`).join('');
}

/* ---------- Restauração de fábrica (gerente) ---------- */
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
    ['vendas', 'top'].forEach(p => {
        $(`${p}-inicio`).value = inicioMes;   // período padrão: mês atual
        $(`${p}-fim`).value = hoje;
    });

    $('select-mes-fluxo').innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    $('select-mes-fluxo').value = agora.getMonth() + 1;

    document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => mostrarAba(b.dataset.aba)));
    $('select-mes-fluxo').addEventListener('change', carregarFluxo);
    $('select-ano-fluxo').addEventListener('change', carregarFluxo);
    $('btn-filtrar-vendas').addEventListener('click', carregarVendas);
    $('btn-filtrar-top').addEventListener('click', carregarTop);

    if (Sessao.cargo() === 'GERENTE') {
        $('area-gerente').hidden = false;
        $('btn-restaurar').addEventListener('click', restaurarSistema);
    }
    mostrarAba(new URLSearchParams(location.search).get('aba') || 'fluxo');
});
