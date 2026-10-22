let produtosCache = [];
let carrinho = [];

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutosPDV();
});

async function carregarProdutosPDV() {
    const res = await apiRequest('/produtos');
    
    if (res && res.produtos && Array.isArray(res.produtos)) {
        produtosCache = res.produtos;
    } else if (Array.isArray(res)) {
        produtosCache = res;
    } else {
        produtosCache = [];
    }

    renderizarGridProdutos(produtosCache);
}

function renderizarGridProdutos(produtos) {
    const grid = document.getElementById('grid-produtos');
    if (!grid) return;

    grid.innerHTML = '';

    if (!produtos || produtos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #5D4037; font-weight: bold;">Nenhum produto cadastrado ou encontrado.</p>';
        return;
    }

    produtos.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="adicionarAoCarrinho('${p.codigo}')">
                <img src="imagens/logo.png" alt="${p.nome}">
                <h4>${p.nome}</h4>
                <div class="price">R$ ${parseFloat(p.preco_venda).toFixed(2)}</div>
                <div class="stock-tag">Estoque: ${p.estoque} un.</div>
                <button class="btn-add-item">+ Adicionar</button>
            </div>
        `;
    });
}

function filtrarProdutos() {
    const termo = document.getElementById('inp-busca-prod').value.toLowerCase();
    const filtrados = produtosCache.filter(p => 
        p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo)
    );
    renderizarGridProdutos(filtrados);
}

function adicionarAoCarrinho(codigo) {
    const produto = produtosCache.find(p => p.codigo === codigo);
    if (!produto) return;

    const itemExistente = carrinho.find(i => i.codigo === codigo);

    if (itemExistente) {
        if (itemExistente.quantidade + 1 > produto.estoque) {
            alert(`⛔ Estoque insuficiente para "${produto.nome}"!\n\nEstoque disponível: ${produto.estoque}`);
            return;
        }
        itemExistente.quantidade++;
    } else {
        if (produto.estoque <= 0) {
            alert(`⛔ O produto "${produto.nome}" está sem estoque!`);
            return;
        }
        carrinho.push({
            codigo: produto.codigo,
            nome: produto.nome,
            preco: parseFloat(produto.preco_venda),
            quantidade: 1
        });
    }

    atualizarCarrinhoUI();
}

function alterarQuantidade(codigo, delta) {
    const item = carrinho.find(i => i.codigo === codigo);
    if (!item) return;

    definirQuantidadeDireta(codigo, item.quantidade + delta);
}

function definirQuantidadeDireta(codigo, novaQtd) {
    const item = carrinho.find(i => i.codigo === codigo);
    const produto = produtosCache.find(p => p.codigo === codigo);

    if (!item || !produto) return;

    let qtd = parseInt(novaQtd);

    if (isNaN(qtd) || qtd <= 0) {
        carrinho = carrinho.filter(i => i.codigo !== codigo);
    } else if (qtd > produto.estoque) {
        alert(`⛔ Quantidade solicitada (${qtd}) é maior que o estoque disponível (${produto.estoque})!`);
        item.quantidade = produto.estoque;
    } else {
        item.quantidade = qtd;
    }

    atualizarCarrinhoUI();
}

function atualizarCarrinhoUI() {
    const lista = document.getElementById('lista-carrinho');
    if (!lista) return;

    lista.innerHTML = '';

    if (carrinho.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #5D4037; margin-top: 20px;">Carrinho vazio</p>';
        document.getElementById('lbl-total-itens').textContent = '0';
        document.getElementById('lbl-total-valor').textContent = 'R$ 0,00';
        return;
    }

    let totalItens = 0;
    let totalValor = 0;

    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        totalItens += item.quantidade;
        totalValor += subtotal;

        lista.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h5>${item.nome}</h5>
                    <span>R$ ${item.preco.toFixed(2)} = R$ ${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-item-controls">
                    <button class="btn-qty" onclick="alterarQuantidade('${item.codigo}', -1)">-</button>
                    <input type="number" 
                           class="input-cart-qty" 
                           value="${item.quantidade}" 
                           min="1" 
                           onchange="definirQuantidadeDireta('${item.codigo}', this.value)"
                           onclick="this.select()">
                    <button class="btn-qty" onclick="alterarQuantidade('${item.codigo}', 1)">+</button>
                </div>
            </div>
        `;
    });

    document.getElementById('lbl-total-itens').textContent = totalItens;
    document.getElementById('lbl-total-valor').textContent = `R$ ${totalValor.toFixed(2)}`;
}

function abrirModalPagamento() {
    if (carrinho.length === 0) {
        alert('Adicione pelo menos um produto ao carrinho antes de finalizar!');
        return;
    }
    document.getElementById('modal-pagamento').style.display = 'flex';
    atualizarCampoTroco();
}

function fecharModalPagamento() {
    document.getElementById('modal-pagamento').style.display = 'none';
}

function atualizarCampoTroco() {
    const forma = document.getElementById('select-forma-pagamento').value;
    const boxTroco = document.getElementById('box-troco');
    if (forma === 'Dinheiro') {
        boxTroco.style.display = 'block';
        
        // Preenche automaticamente o campo com o valor total exato da venda
        const totalValor = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
        const inpRecebido = document.getElementById('inp-valor-recebido');
        if (inpRecebido) {
            inpRecebido.value = totalValor.toFixed(2);
            // Seleciona o texto ao focar para facilitar caso queiram alterar a quantia
            inpRecebido.onclick = function() { this.select(); };
            inpRecebido.onfocus = function() { this.select(); };
        }
        calcularTroco();
    } else {
        boxTroco.style.display = 'none';
    }
}

function calcularTroco() {
    const totalValor = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
    const recebido = parseFloat(document.getElementById('inp-valor-recebido').value) || 0;
    const troco = recebido - totalValor;

    const lbl = document.getElementById('lbl-troco');
    if (troco >= 0) {
        lbl.textContent = `Troco: R$ ${troco.toFixed(2)}`;
        lbl.style.color = '#2E7D32';
    } else {
        lbl.textContent = `Falta: R$ ${Math.abs(troco).toFixed(2)}`;
        lbl.style.color = '#C62828';
    }
}

async function confirmarVenda() {
    const formaPagamento = document.getElementById('select-forma-pagamento').value;
    const totalValor = carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);

    if (formaPagamento === 'Dinheiro') {
        const recebido = parseFloat(document.getElementById('inp-valor-recebido').value) || 0;
        if (recebido < totalValor) {
            alert('O valor recebido em dinheiro é inferior ao total da venda!');
            return;
        }
    }

    const payload = {
        total: totalValor,
        forma_pagamento: formaPagamento,
        itens: carrinho
    };

    const res = await apiRequest('/vendas', 'POST', payload);

    if (res && res.sucesso) {
        alert('✅ Venda realizada com sucesso!');
        fecharModalPagamento();
        carrinho = [];
        atualizarCarrinhoUI();

        setTimeout(() => {
            const desejaOutra = confirm('Deseja realizar outra venda?');
            if (desejaOutra) {
                carregarProdutosPDV();
            } else {
                window.location.href = 'inicio.html';
            }
        }, 50);
    }
}