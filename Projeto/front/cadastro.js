let produtosLista = [];
let codigoParaExcluir = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();

    document.getElementById('form-produto')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const modo = document.getElementById('prod-modo').value;
        const codigo = document.getElementById('prod-codigo').value;
        const nome = document.getElementById('prod-nome').value;
        const categoria = document.getElementById('prod-categoria').value || 'Geral';
        const preco_venda = parseFloat(document.getElementById('prod-preco').value);

        if (modo === 'CADASTRO') {
            const res = await apiRequest('/produtos', 'POST', {
                codigo, nome, categoria, preco_venda, estoque: 0
            });
            if (res && res.sucesso) {
                alert('✅ Produto cadastrado com sucesso!');
                posAcaoCadastro();
            }
        } else if (modo === 'EDICAO') {
            const res = await apiRequest('/produtos', 'PUT', {
                codigo, nome, categoria, preco_venda
            });
            if (res && res.sucesso) {
                alert('✅ Produto atualizado com sucesso!');
                posAcaoCadastro();
            }
        }
    });
});

function posAcaoCadastro() {
    resetarFormulario();
    setTimeout(() => {
        const desejaMais = confirm('Deseja realizar mais alterações no cadastro de produtos?');
        if (desejaMais) {
            carregarProdutos();
        } else {
            window.location.href = 'inicio.html';
        }
    }, 100);
}

async function carregarProdutos() {
    const res = await apiRequest('/produtos') || {};
    produtosLista = res.produtos || [];
    const proximoCodigo = res.proximo_codigo || "01";

    if (document.getElementById('prod-modo').value === 'CADASTRO') {
        document.getElementById('prod-codigo').value = proximoCodigo;
    }

    renderizarTabela(produtosLista);
}

function renderizarTabela(produtos) {
    const tbody = document.getElementById('tb-produtos-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    produtos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.codigo}</strong></td>
                <td>${p.nome}</td>
                <td>${p.categoria || '-'}</td>
                <td>R$ ${parseFloat(p.preco_venda).toFixed(2)}</td>
                <td>${p.estoque} un.</td>
                <td>
                    <button class="btn-table-action btn-edit" onclick="prepararEdicao('${p.codigo}')">✏️ Editar</button>
                    <button class="btn-table-action btn-delete" onclick="solicitarExclusao('${p.codigo}', '${p.nome}')">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
}

function prepararEdicao(codigo) {
    const prod = produtosLista.find(p => p.codigo === codigo);
    if (!prod) return;

    document.getElementById('form-title').textContent = `Editar Produto (${codigo})`;
    document.getElementById('prod-modo').value = 'EDICAO';
    document.getElementById('prod-codigo').value = prod.codigo;
    document.getElementById('prod-nome').value = prod.nome;
    document.getElementById('prod-categoria').value = prod.categoria || '';
    document.getElementById('prod-preco').value = prod.preco_venda;

    document.getElementById('btn-salvar-prod').textContent = 'Salvar Alterações';
    document.getElementById('btn-cancelar-edicao').style.display = 'block';
}

function resetarFormulario() {
    document.getElementById('form-title').textContent = 'Novo Produto';
    document.getElementById('prod-modo').value = 'CADASTRO';
    document.getElementById('prod-nome').value = '';
    document.getElementById('prod-categoria').value = '';
    document.getElementById('prod-preco').value = '';
    document.getElementById('btn-salvar-prod').textContent = 'Cadastrar Produto';
    document.getElementById('btn-cancelar-edicao').style.display = 'none';

    carregarProdutos();
}

function solicitarExclusao(codigo, nome) {
    codigoParaExcluir = codigo;
    const msgLabel = document.getElementById('lbl-msg-exclusao');
    if (msgLabel) {
        msgLabel.innerHTML = `Tem certeza que deseja excluir o produto <strong>"${nome}"</strong> (Cód: ${codigo})?<br><br><span style="color:#C02E28; font-weight:bold;">Esta ação é permanente e removerá o item do catálogo!</span>`;
    }
    document.getElementById('modal-confirmar-exclusao').style.display = 'flex';
}

function fecharModalExclusao() {
    codigoParaExcluir = null;
    document.getElementById('modal-confirmar-exclusao').style.display = 'none';
}

async function confirmarExclusaoModal() {
    if (!codigoParaExcluir) return;

    const res = await apiRequest(`/produtos/${codigoParaExcluir}`, 'DELETE');
    fecharModalExclusao();

    if (res && res.sucesso) {
        alert('🗑️ Produto excluído com sucesso!');
        posAcaoCadastro();
    }
}