let produtos = [];
let carrinho = [];   // { codigo, nome, preco (centavos), quantidade }
let filtroCategoria = null;

const $ = id => document.getElementById(id);
const totalCarrinho = () => carrinho.reduce((soma, i) => soma + i.preco * i.quantidade, 0);

async function carregarProdutos() {
    const res = await apiRequest('/produtos');
    produtos = res?.produtos || [];
    renderizarGrid();
}

function produtosFiltrados() {
    const termo = $('inp-busca-prod').value.trim().toLowerCase();
    const categoria = filtroCategoria ? filtroCategoria.valor() : '';
    return produtos.filter(p =>
        (!categoria || p.categoria === categoria) &&
        (p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo)));
}

function renderizarGrid() {
    const lista = produtosFiltrados();
    if (lista.length === 0) {
        $('grid-produtos').innerHTML = '<p class="vazio" style="grid-column:1/-1">Nenhum produto encontrado com esse filtro.</p>';
        return;
    }
    $('grid-produtos').innerHTML = lista.map(p => {
        const esgotado = p.estoque <= 0;
        return `
            <button type="button" class="product-card" data-codigo="${escapeHtml(p.codigo)}" ${esgotado ? 'disabled' : ''}>
                <img src="imagens/logo.png" alt="">
                <h4>${escapeHtml(p.nome)}</h4>
                <div class="price">${formatarMoeda(p.preco_venda)}</div>
                <div class="stock-tag ${esgotado ? 'esgotado' : ''}">${esgotado ? 'Esgotado' : `Estoque: ${p.estoque} un.`}</div>
            </button>`;
    }).join('');
}

function adicionar(codigo) {
    const produto = produtos.find(p => p.codigo === codigo);
    if (!produto) return;
    const item = carrinho.find(i => i.codigo === codigo);
    if (item) return definirQuantidade(codigo, item.quantidade + 1);
    if (produto.estoque <= 0) return toast(`"${produto.nome}" está sem estoque.`, 'aviso');
    carrinho.push({ codigo, nome: produto.nome, preco: produto.preco_venda, quantidade: 1 });
    renderizarCarrinho();
}

function definirQuantidade(codigo, quantidade) {
    const item = carrinho.find(i => i.codigo === codigo);
    const produto = produtos.find(p => p.codigo === codigo);
    if (!item || !produto) return;

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        carrinho = carrinho.filter(i => i.codigo !== codigo);
    } else if (quantidade > produto.estoque) {
        toast(`Só há ${produto.estoque} un. de "${produto.nome}" em estoque.`, 'aviso');
        item.quantidade = produto.estoque;
    } else {
        item.quantidade = quantidade;
    }
    renderizarCarrinho();
}

function renderizarCarrinho() {
    const lista = $('lista-carrinho');
    if (carrinho.length === 0) {
        lista.innerHTML = '<p class="vazio">Carrinho vazio. Toque em um produto para adicionar.</p>';
    } else {
        lista.innerHTML = carrinho.map(i => `
            <div class="cart-item" data-codigo="${escapeHtml(i.codigo)}">
                <div>
                    <h5>${escapeHtml(i.nome)}</h5>
                    <span>${formatarMoeda(i.preco)} × ${i.quantidade} = ${formatarMoeda(i.preco * i.quantidade)}</span>
                </div>
                <div class="cart-item-controls">
                    <button type="button" class="btn-qty" data-acao="menos" aria-label="Diminuir">−</button>
                    <input type="number" class="input-cart-qty" min="1" value="${i.quantidade}" aria-label="Quantidade de ${escapeHtml(i.nome)}">
                    <button type="button" class="btn-qty" data-acao="mais" aria-label="Aumentar">+</button>
                </div>
            </div>`).join('');
    }
    $('lbl-total-itens').textContent = carrinho.reduce((s, i) => s + i.quantidade, 0);
    $('lbl-total-valor').textContent = formatarMoeda(totalCarrinho());
}

/* ---------- Pagamento ---------- */
function atualizarTroco() {
    const dinheiro = $('select-forma-pagamento').value === 'Dinheiro';
    $('box-troco').hidden = !dinheiro;
    if (!dinheiro) return;
    const dif = lerCentavos($('inp-valor-recebido')) - totalCarrinho();
    const rotulo = $('lbl-troco');
    rotulo.textContent = dif >= 0 ? `Troco: ${formatarMoeda(dif)}` : `Falta: ${formatarMoeda(-dif)}`;
    rotulo.className = dif >= 0 ? 'troco-ok' : 'troco-falta';
}

function abrirPagamento() {
    if (carrinho.length === 0) return toast('Adicione pelo menos um produto antes de finalizar.', 'aviso');
    $('lbl-total-modal').textContent = formatarMoeda(totalCarrinho());
    definirMoeda($('inp-valor-recebido'), totalCarrinho());   // sugere o valor exato
    $('modal-pagamento').hidden = false;
    atualizarTroco();
    $('select-forma-pagamento').focus();
}
const fecharPagamento = () => { $('modal-pagamento').hidden = true; };

async function confirmarVenda() {
    const forma = $('select-forma-pagamento').value;
    const total = totalCarrinho();
    const recebido = lerCentavos($('inp-valor-recebido'));
    if (forma === 'Dinheiro' && recebido < total) return toast('O valor recebido é menor que o total da venda.', 'aviso');

    const botao = $('btn-confirmar-venda');
    botao.disabled = true;                          // evita venda duplicada por clique duplo
    const res = await apiRequest('/vendas', 'POST', {
        forma_pagamento: forma,
        itens: carrinho.map(({ codigo, quantidade }) => ({ codigo, quantidade })),   // preço e total o servidor calcula
    });
    botao.disabled = false;
    if (!res?.sucesso) return;

    const troco = forma === 'Dinheiro' ? ` Troco: ${formatarMoeda(recebido - total)}.` : '';
    toast(`Venda #${res.venda_id} registrada: ${formatarMoeda(res.total)}.${troco}`, 'sucesso', 6000);
    carrinho = [];
    renderizarCarrinho();
    fecharPagamento();
    $('inp-busca-prod').value = '';
    await carregarProdutos();                       // estoque atualizado
    $('inp-busca-prod').focus();
}

document.addEventListener('DOMContentLoaded', () => {
    filtroCategoria = criarFiltroCategorias($('chips-categoria'), renderizarGrid);

    $('grid-produtos').addEventListener('click', e => {
        const card = e.target.closest('.product-card');
        if (card) adicionar(card.dataset.codigo);
    });

    $('lista-carrinho').addEventListener('click', e => {
        const botao = e.target.closest('[data-acao]');
        if (!botao) return;
        const codigo = botao.closest('.cart-item').dataset.codigo;
        const item = carrinho.find(i => i.codigo === codigo);
        definirQuantidade(codigo, item.quantidade + (botao.dataset.acao === 'mais' ? 1 : -1));
    });
    $('lista-carrinho').addEventListener('change', e => {
        if (e.target.matches('.input-cart-qty')) {
            definirQuantidade(e.target.closest('.cart-item').dataset.codigo, parseInt(e.target.value, 10));
        }
    });

    $('inp-busca-prod').addEventListener('input', renderizarGrid);
    $('inp-busca-prod').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const lista = produtosFiltrados();
        if (lista.length === 1) {
            adicionar(lista[0].codigo);
            $('inp-busca-prod').value = '';
            renderizarGrid();
        }
    });

    $('btn-finalizar').addEventListener('click', abrirPagamento);
    $('btn-limpar').addEventListener('click', async () => {
        if (carrinho.length && await confirmar('Remover todos os itens do carrinho?', { textoOk: 'Limpar', perigo: true })) {
            carrinho = [];
            renderizarCarrinho();
        }
    });
    $('btn-cancelar-pagamento').addEventListener('click', fecharPagamento);
    $('btn-confirmar-venda').addEventListener('click', confirmarVenda);
    $('select-forma-pagamento').addEventListener('change', () => {
        definirMoeda($('inp-valor-recebido'), totalCarrinho());
        atualizarTroco();
    });
    $('inp-valor-recebido').addEventListener('input', atualizarTroco);
    $('modal-pagamento').addEventListener('click', e => { if (e.target.id === 'modal-pagamento') fecharPagamento(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal-pagamento').hidden) fecharPagamento(); });

    renderizarCarrinho();
    carregarProdutos();
});
