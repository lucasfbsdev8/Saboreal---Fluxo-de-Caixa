/* layout.js - protege a página (login), desenha o menu lateral e aplica a regra
   "caixa fechado". Depende de utils.js e api.js. */

/* Páginas que só abrem com o caixa aberto. Para liberar alguma, remova daqui. */
const PAGINAS_COM_CAIXA_ABERTO = ['vendas.html', 'cadastro.html', 'estoque.html'];

let _statusCaixa = null;
/* Uma única consulta de status por página (compartilhada entre menu e página). */
function obterStatusCaixa(forcar = false) {
    if (!_statusCaixa || forcar) {
        _statusCaixa = apiRequest('/caixa/status').then(r => r || { aberto: false });
    }
    return _statusCaixa;
}

async function sair() {
    const status = await obterStatusCaixa(true);
    if (status.aberto) {
        toast('Feche o caixa antes de sair do sistema.', 'aviso');
        setTimeout(() => { location.href = 'caixa.html?aba=fechar'; }, 1200);
        return;
    }
    Sessao.limpar();
    location.href = 'login.html';
}

(function iniciarLayout() {
    if (!exigirLogin()) return;

    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const pagina = location.pathname.split('/').pop() || 'inicio.html';
    const aba = new URLSearchParams(location.search).get('aba');

    function desenhar(aberto) {          // aberto: true | false | null (ainda carregando)
        const trava = aberto === false;
        const item = (href, rotulo, ativo) => `
            <li class="${ativo ? 'active' : ''}">
                <a href="${trava ? '#' : href}" class="${trava ? 'bloqueado' : ''}">${rotulo}</a>
            </li>`;
        const rotuloCaixa = `${icone('caixa')} ${aberto === true ? 'Fechar caixa' : aberto === false ? 'Abrir caixa' : 'Caixa'}`;
        const hrefCaixa = aberto === true ? 'caixa.html?aba=fechar' : aberto === false ? 'caixa.html?aba=abrir' : 'caixa.html';
        const emMovimentacoes = ['vendas.html', 'cadastro.html', 'estoque.html'].includes(pagina) || (pagina === 'caixa.html' && aba === 'saida');
        const emRelatorios = pagina === 'relatorios.html';
        const subRel = (id, rotulo) => `<li class="${(aba || 'fluxo') === id ? 'active' : ''}"><a href="relatorios.html?aba=${id}">${rotulo}</a></li>`;

        container.innerHTML = `
            <nav class="sidebar" aria-label="Menu principal">
                <div>
                    <div class="brand">
                        <img src="imagens/logo.png" alt="Logo Saboreal">
                        <h1>SABOREAL</h1>
                        <p>BISCOITOS CASEIROS</p>
                    </div>
                    <ul class="menu">
                        <li class="${pagina === 'inicio.html' ? 'active' : ''}"><a href="inicio.html">${icone('casa')} Início</a></li>
                        <li class="${pagina === 'caixa.html' && aba !== 'saida' ? 'active' : ''}"><a href="${hrefCaixa}">${rotuloCaixa}</a></li>
                        <li class="${emMovimentacoes ? 'active' : ''}">
                            <span class="menu-grupo">${icone('movimentacoes')} Movimentações ${trava ? icone('cadeado', 'icone-sm') : ''}</span>
                            <ul class="sub-menu">
                                ${item('vendas.html', 'Nova venda', pagina === 'vendas.html')}
                                ${item('caixa.html?aba=saida', 'Nova saída', pagina === 'caixa.html' && aba === 'saida')}
                                ${item('estoque.html', 'Adicionar estoque', pagina === 'estoque.html')}
                                ${item('cadastro.html', 'Cadastro de produtos', pagina === 'cadastro.html')}
                            </ul>
                        </li>
                        <li class="${emRelatorios ? 'active' : ''}">
                            <a href="relatorios.html">${icone('relatorios')} Relatórios</a>
                            ${emRelatorios ? `<ul class="sub-menu">${subRel('fluxo', 'Fluxo de caixa')}${subRel('movimentacoes', 'Histórico de movimentações')}</ul>` : ''}                        </li>
                    </ul>
                </div>
                <ul class="menu"><li><a href="#" id="btn-sair">${icone('sair')} Sair (${escapeHtml(Sessao.usuario())})</a></li></ul>
            </nav>`;
    }

    // Eventos delegados: continuam valendo quando o menu é redesenhado.
    container.addEventListener('click', e => {
        if (e.target.closest('a.bloqueado')) {
            e.preventDefault();
            toast('Abra o caixa para acessar esta área.', 'aviso');
        } else if (e.target.closest('#btn-sair')) {
            e.preventDefault();
            sair();
        }
    });

    // Menu "hambúrguer" no celular/tablet.
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'menu-toggle';
        botao.setAttribute('aria-label', 'Abrir menu');
        botao.innerHTML = icone('menu');
        botao.addEventListener('click', () => document.body.classList.toggle('menu-aberto'));
        topBar.prepend(botao);
    }
    document.addEventListener('click', e => {
        if (document.body.classList.contains('menu-aberto') && !e.target.closest('.sidebar, .menu-toggle')) {
            document.body.classList.remove('menu-aberto');
        }
    });

    desenhar(null);                      // menu aparece já, sem esperar a rede
    obterStatusCaixa().then(status => {
        if (status.implantado === false) {            // primeiro acesso: falta informar o saldo inicial do caixa
            location.replace('implantacao.html');
            return;
        }
        desenhar(!!status.aberto);
        const exigeCaixa = PAGINAS_COM_CAIXA_ABERTO.includes(pagina) || (pagina === 'caixa.html' && aba === 'saida');
        if (exigeCaixa && !status.aberto) {
            toast('O caixa está fechado. Abra o caixa para acessar esta página.', 'aviso');
            setTimeout(() => location.replace('inicio.html'), 1200);
        }
    });
})();
