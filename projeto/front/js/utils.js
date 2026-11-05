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

/* ---------- Ícones (SVG, estilo Lucide) ---------- */
const ICONES = {
    casa:           '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    relatorios:     '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    caixa:          '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>',
    carrinho:       '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    cadastro:       '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
    sair:           '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    movimentacoes:  '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    cadeado:        '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'cadeado-aberto': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    'nova-saida':   '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    estoque:        '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.29 7 8.71 5 8.71-5"/><path d="m7.5 4.27 9 5.15"/>',
    editar:         '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    excluir:        '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    ok:             '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alerta:         '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info:           '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    menu:           '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    'seta-cima':    '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    'seta-baixo':   '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
};

/* icone('casa') -> string <svg>. 2º parâmetro: classe extra (ex.: 'icone-sm'). */
function icone(nome, classe = '') {
    return `<svg class="icone ${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ''}</svg>`;
}