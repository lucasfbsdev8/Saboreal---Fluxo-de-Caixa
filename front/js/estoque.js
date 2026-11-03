let produtos = [];
let filtroCategoria = null;
const $ = id => document.getElementById(id);

async function carregar() {
    const res = await apiRequest('/produtos');
    produtos = res?.produtos || [];
    renderizar();
}

function renderizar() {
    const termo = $('inp-busca').value.trim().toLowerCase();
    const categoria = filtroCategoria ? filtroCategoria.valor() : '';
    const lista = produtos.filter(p =>
        (!categoria || p.categoria === categoria) &&
        (p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo)));
    const corpo = $('tb-estoque');

    if (lista.length === 0) {
        corpo.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum produto encontrado.</td></tr>';
        return;
    }
    corpo.innerHTML = lista.map(p => `
        <tr data-codigo="${escapeHtml(p.codigo)}">
            <td><strong>${escapeHtml(p.codigo)}</strong></td>
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.categoria)}</td>
            <td class="num ${p.estoque <= 0 ? 'esgotado-txt' : ''}"><strong>${p.estoque} un.</strong></td>
            <td>
                <div class="box-ajuste">
                    <input type="number" step="1" class="form-control" placeholder="Ex.: 20 ou -5" aria-label="Ajuste de estoque de ${escapeHtml(p.nome)}">
                    <button type="button" class="btn-success" data-acao="ajustar">Confirmar</button>
                </div>
            </td>
        </tr>`).join('');
}

async function ajustar(linha) {
    const campo = linha.querySelector('input');
    const quantidade = parseInt(campo.value, 10);
    if (!Number.isInteger(quantidade) || quantidade === 0) {
        return toast('Digite um número para entrada (ex.: 20) ou baixa (ex.: -5).', 'aviso');
    }
    const res = await apiRequest('/produtos/estoque', 'POST', { codigo: linha.dataset.codigo, quantidade });
    if (res?.sucesso) {
        toast(`Estoque atualizado. Novo saldo: ${res.novo_estoque} un.`, 'sucesso');
        carregar();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    filtroCategoria = criarFiltroCategorias($('chips-categoria'), renderizar);
    $('inp-busca').addEventListener('input', renderizar);
    $('tb-estoque').addEventListener('click', e => {
        const botao = e.target.closest('[data-acao="ajustar"]');
        if (botao) ajustar(botao.closest('tr'));
    });
    $('tb-estoque').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('input')) ajustar(e.target.closest('tr'));
    });
    carregar();
});
