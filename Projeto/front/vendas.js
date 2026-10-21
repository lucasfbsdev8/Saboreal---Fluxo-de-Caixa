let listaProdutos = [];
let carrinho = [];

document.addEventListener('DOMContentLoaded', async () => {
    listaProdutos = await apiRequest('/produtos') || [];
    const select = document.getElementById('sel-produto');
    
    select.innerHTML = '';
    listaProdutos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.codigo;
        opt.textContent = `${p.codigo} - ${p.nome} (Estoque: ${p.estoque}) - R$ ${p.preco_venda.toFixed(2)}`;
        select.appendChild(opt);
    });

    document.getElementById('btn-add').addEventListener('click', adicionarItem);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarVenda);
});

function adicionarItem() {
    const cod = document.getElementById('sel-produto').value;
    const qtd = parseInt(document.getElementById('inp-qtd').value);
    
    if (isNaN(qtd) || qtd <= 0) {
        alert('Informe uma quantidade válida!');
        return;
    }

    const prod = listaProdutos.find(p => p.codigo === cod);

    if (prod) {
        const qtdNoCarrinho = carrinho
            .filter(item => item.codigo === cod)
            .reduce((total, item) => total + item.quantidade, 0);

        const totalPretendido = qtdNoCarrinho + qtd;

        if (totalPretendido > prod.estoque) {
            alert(`⛔ Estoque insuficiente para "${prod.nome}"!\n\nEstoque disponível: ${prod.estoque}\nQuantidade solicitada: ${totalPretendido}`);
            return;
        }

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
        tbody.innerHTML += `
            <tr>
                <td>${item.codigo}</td>
                <td>${item.nome}</td>
                <td>${item.quantidade}</td>
                <td>R$ ${subtotal.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('lbl-total').textContent = total.toFixed(2);
}

async function finalizarVenda() {
    if (carrinho.length === 0) return alert('O carrinho está vazio!');
    
    const total = parseFloat(document.getElementById('lbl-total').textContent);
    const forma = document.getElementById('sel-forma').value;

    const res = await apiRequest('/vendas', 'POST', {
        total: total,
        forma_pagamento: forma,
        itens: carrinho
    });

    if (res && res.sucesso) {
        alert('✅ Venda realizada com sucesso!');
        carrinho = [];
        renderCarrinho();
        listaProdutos = await apiRequest('/produtos') || [];
    }
}