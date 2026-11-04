let lista = [];
let editando = null;   // código em edição, ou null (cadastro novo)

const $ = id => document.getElementById(id);

async function carregar() {
    const res = await apiRequest('/produtos');
    lista = res?.produtos || [];
    if (!editando) $('prod-codigo').value = res?.proximo_codigo || '01';
    renderizarTabela();
}

function renderizarTabela() {
    const corpo = $('tb-produtos-body');
    if (lista.length === 0) {
        corpo.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum produto cadastrado ainda. Use o formulário ao lado.</td></tr>';
        return;
    }
    corpo.innerHTML = lista.map(p => `
        <tr data-codigo="${escapeHtml(p.codigo)}">
            <td><strong>${escapeHtml(p.codigo)}</strong></td>
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.categoria)}</td>
            <td class="num">${formatarMoeda(p.preco_venda)}</td>
            <td class="num">${p.estoque} un.</td>
            <td>
                <button type="button" class="btn-table-action btn-edit" data-acao="editar">${icone('editar')} Editar</button>
                <button type="button" class="btn-table-action btn-delete" data-acao="remover">${icone('excluir')} Excluir</button>
            </td>
        </tr>`).join('');
}

function modoCadastro() {
    editando = null;
    $('form-title').textContent = 'Novo produto';
    $('btn-salvar-prod').textContent = 'Cadastrar produto';
    $('btn-cancelar-edicao').hidden = true;
    $('form-produto').reset();
    definirMoeda($('prod-preco'), 0);
    carregar();
}

function modoEdicao(codigo) {
    const p = lista.find(x => x.codigo === codigo);
    if (!p) return;
    editando = codigo;
    $('form-title').textContent = `Editar produto ${codigo}`;
    $('prod-codigo').value = p.codigo;
    $('prod-nome').value = p.nome;
    $('prod-categoria').value = p.categoria;
    definirMoeda($('prod-preco'), p.preco_venda);
    $('btn-salvar-prod').textContent = 'Salvar alterações';
    $('btn-cancelar-edicao').hidden = false;
    $('prod-nome').focus();
}

document.addEventListener('DOMContentLoaded', () => {
    $('prod-categoria').innerHTML = '<option value="" disabled selected>Selecione a categoria…</option>' +
        CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');

    $('form-produto').addEventListener('submit', async e => {
        e.preventDefault();
        if (!$('prod-categoria').value) return toast('Escolha a categoria do produto.', 'aviso');
        const botao = $('btn-salvar-prod');
        botao.disabled = true;

        const dados = {
            nome: $('prod-nome').value,
            categoria: $('prod-categoria').value,
            preco_venda: lerCentavos($('prod-preco')),
        };
        const res = editando
            ? await apiRequest(`/produtos/${encodeURIComponent(editando)}`, 'PUT', dados)
            : await apiRequest('/produtos', 'POST', dados);

        botao.disabled = false;
        if (res?.sucesso) {
            toast(editando ? 'Produto atualizado!' : `Produto ${res.codigo} cadastrado!`, 'sucesso');
            modoCadastro();
        }
    });

    $('btn-cancelar-edicao').addEventListener('click', modoCadastro);

    $('tb-produtos-body').addEventListener('click', async e => {
        const botao = e.target.closest('[data-acao]');
        if (!botao) return;
        const codigo = botao.closest('tr').dataset.codigo;

        if (botao.dataset.acao === 'editar') return modoEdicao(codigo);

        const produto = lista.find(p => p.codigo === codigo);
        const confirmado = await confirmar(
            `Excluir "${produto.nome}" (cód. ${codigo})?\nO produto sai do catálogo, mas o histórico de vendas é mantido.`,
            { textoOk: 'Excluir', perigo: true }
        );
        if (!confirmado) return;
        const res = await apiRequest(`/produtos/${encodeURIComponent(codigo)}`, 'DELETE');
        if (res?.sucesso) {
            toast('Produto excluído.', 'sucesso');
            if (editando === codigo) modoCadastro(); else carregar();
        }
    });

    modoCadastro();
});
