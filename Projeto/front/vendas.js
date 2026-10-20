// vendas.js
let listaProdutos = [];
let carrinho = [];

document.addEventListener('DOMContentLoaded', async () => {
    listaProdutos = await apiRequest('/produtos') || [];
    const select = document.getElementById('sel-produto');
    
    listaProdutos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.codigo;
        opt.textContent = `${p.codigo} - ${p.nome} (R$ ${p.preco_venda.toFixed(2)})`;
        select.appendChild(opt);
    });

    document.getElementById('btn-add').addEventListener('click', adicionarItem);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarVenda);
});

function adicionarItem() {
    const cod = document.getElementById('sel-produto').value;
    const qtd = parseInt(document.getElementById('inp-qtd').value);
    const prod = listaProdutos.find(p => p.codigo === cod);

    if (prod) {
        carrinho.push({ codigo: prod.codigo, nome: prod.nome, quantidade: qtd, preco: prod.preco_venda });
        renderCarrinho();
    }
}

function renderCarrinho() {
    const tbody = document.getElementById('tb-carrinho');
    tbody.innerHTML = '';
    let total = 0;

    carrinho.forEach(item => {
        const subtotal = item.quantidade * item.preco;
        total += subtotal;
        tbody.innerHTML += `<tr><td>${item.codigo}</td><td>${item.nome}</td><td>${item.quantidade}</td><td>R$ ${subtotal.toFixed(2)}</td></tr>`;
    });

    document.getElementById('lbl-total').textContent = total.toFixed(2);
}

async function finalizarVenda() {
    if (carrinho.length === 0) return alert('Carrinho vazio!');
    
    const total = parseFloat(document.getElementById('lbl-total').textContent);
    const forma = document.getElementById('sel-forma').value;

    const res = await apiRequest('/vendas', 'POST', {
        total: total,
        forma_pagamento: forma,
        itens: carrinho
    });

    if (res && res.sucesso) {
        alert('Venda realizada com sucesso!');
        carrinho = [];
        renderCarrinho();
    }
}
