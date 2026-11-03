/* utils.js - funções compartilhadas (carregar antes dos demais scripts).
   Convenção: dinheiro trafega SEMPRE em centavos (inteiros). */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
}

function formatarMoeda(centavos) {
    return ((Number(centavos) || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Máscara de moeda estilo maquininha: digita só números, o valor "cresce" da direita p/ esquerda. */
function lerCentavos(input) {
    return parseInt(String(input?.value || '').replace(/\D/g, ''), 10) || 0;
}
function definirMoeda(input, centavos) {
    if (input) input.value = formatarMoeda(centavos);
}
function mascaraMoeda(input) {
    const digitos = input.value.replace(/\D/g, '').slice(-9);
    definirMoeda(input, parseInt(digitos, 10) || 0);
}

function formatarDataHora(texto) {
    const d = new Date(String(texto).replace(' ', 'T'));
    return isNaN(d) ? '-' : d.toLocaleString('pt-BR');
}
function dataISO(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ---------- Avisos (substituem alert) ---------- */
function toast(mensagem, tipo = 'info', duracao = 3800) {
    let area = document.getElementById('toasts');
    if (!area) {
        area = document.createElement('div');
        area.id = 'toasts';
        area.setAttribute('role', 'status');
        area.setAttribute('aria-live', 'polite');
        document.body.appendChild(area);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${tipo}`;
    el.textContent = mensagem;
    area.appendChild(el);
    setTimeout(() => el.remove(), duracao);
}

/* ---------- Diálogos (substituem confirm/prompt) ---------- */
function _dialogo({ titulo, mensagem, campoSenha = false, textoOk = 'Confirmar', perigo = false }) {
    return new Promise(resolve => {
        const fundo = document.createElement('div');
        fundo.className = 'modal-overlay';
        fundo.innerHTML = `
            <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dlg-titulo">
                <h3 id="dlg-titulo">${escapeHtml(titulo)}</h3>
                <p class="modal-msg">${escapeHtml(mensagem)}</p>
                ${campoSenha ? '<input type="password" class="form-control" id="dlg-senha" autocomplete="current-password" placeholder="Senha" aria-label="Senha">' : ''}
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-r="cancelar">Cancelar</button>
                    <button type="button" class="${perigo ? 'btn-danger' : 'btn-success'}" data-r="ok">${escapeHtml(textoOk)}</button>
                </div>
            </div>`;
        document.body.appendChild(fundo);

        const campo = fundo.querySelector('#dlg-senha');
        const fechar = ok => {
            document.removeEventListener('keydown', teclas);
            fundo.remove();
            resolve({ ok, valor: campo ? campo.value : '' });
        };
        const teclas = e => {
            if (e.key === 'Escape') fechar(false);
            if (e.key === 'Enter' && campo) fechar(true);
        };
        fundo.addEventListener('click', e => {
            if (e.target === fundo) return fechar(false);
            const botao = e.target.closest('[data-r]');
            if (botao) fechar(botao.dataset.r === 'ok');
        });
        document.addEventListener('keydown', teclas);
        (campo || fundo.querySelector('[data-r="ok"]')).focus();
    });
}
async function confirmar(mensagem, opcoes = {}) {
    return (await _dialogo({ titulo: 'Confirmação', ...opcoes, mensagem })).ok;
}
async function pedirSenha(mensagem, opcoes = {}) {
    const r = await _dialogo({ titulo: 'Confirme sua senha', ...opcoes, mensagem, campoSenha: true });
    return r.ok ? r.valor : null;
}

/* Aplica a máscara em todo <input data-moeda>. */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[data-moeda]').forEach(input => {
        input.addEventListener('input', () => mascaraMoeda(input));
        input.addEventListener('focus', () => input.select());
        if (!input.value) definirMoeda(input, 0);
    });
});

/* ---------- Categorias oficiais da loja ---------- */
const CATEGORIAS = ['Biscoitos', 'Doces', 'Bolos', 'Salgados', 'Bebidas'];

/* Botões de filtro por categoria. Devolve { valor() } com a categoria ativa ('' = todas). */
function criarFiltroCategorias(container, aoMudar) {
    let ativa = '';
    const desenhar = () => {
        container.innerHTML = ['', ...CATEGORIAS].map(c =>
            `<button type="button" class="chip ${c === ativa ? 'active' : ''}" data-categoria="${c}" aria-pressed="${c === ativa}">${c || 'Todas'}</button>`
        ).join('');
    };
    container.addEventListener('click', e => {
        const botao = e.target.closest('[data-categoria]');
        if (!botao) return;
        ativa = botao.dataset.categoria;
        desenhar();
        aoMudar();
    });
    desenhar();
    return { valor: () => ativa };
}
