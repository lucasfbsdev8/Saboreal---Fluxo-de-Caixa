document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const path = window.location.pathname.split('/').pop();
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba');
    const usuario = localStorage.getItem('usuario') || 'Gerência';

    // Checa status do caixa no backend
    const statusCaixa = await apiRequest('/caixa/status') || { aberto: false };
    const caixaAberto = statusCaixa.aberto;

    // Bloqueio de paginas protegidas se o caixa estiver fechado
    const paginasProtegidas = ['vendas.html', 'cadastro.html', 'estoque.html'];
    if (!caixaAberto && paginasProtegidas.includes(path)) {
        alert('⛔ O caixa está fechado! Abra o caixa para acessar esta página.');
        window.location.href = 'inicio.html';
        return;
    }

    if (!caixaAberto && path === 'caixa.html' && aba === 'saida') {
        alert('⛔ O caixa está fechado! Abra o caixa para registrar saídas.');
        window.location.href = 'inicio.html';
        return;
    }

    container.innerHTML = `
        <div class="sidebar">
            <div>
                <div class="brand">
                    <img src="imagens/logo.png" alt="Logo Saboreal" style="width: 50px; height: auto; margin-bottom: 5px;">
                    <h1>SABOREAL</h1>
                    <p>BISCOITOS CASEIROS</p>
                </div>
                <ul class="menu">
                    <li class="${path === 'inicio.html' ? 'active' : ''}">
                        <a href="inicio.html">🏠 Início</a>
                    </li>
                    
                    <li class="${path.includes('caixa.html') && aba !== 'saida' ? 'active' : ''}">
                        <a href="caixa.html?aba=${caixaAberto ? 'fechar' : 'abrir'}">
                            💲 ${caixaAberto ? 'Fechar caixa' : 'Abrir caixa'}
                        </a>
                    </li>

                    <li class="${path === 'vendas.html' || path === 'cadastro.html' || path === 'estoque.html' || aba === 'saida' ? 'active' : ''}">
                        <a href="#" style="${!caixaAberto ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                            🔄 Movimentações ${!caixaAberto ? '🔒' : ''}
                        </a>
                        <ul class="sub-menu">
                            <li class="${path === 'vendas.html' ? 'active' : ''}">
                                <a href="${caixaAberto ? 'vendas.html' : '#'}" onclick="${!caixaAberto ? "alert('Caixa fechado!'); return false;" : ''}">Nova venda</a>
                            </li>
                            <li class="${aba === 'saida' ? 'active' : ''}">
                                <a href="${caixaAberto ? 'caixa.html?aba=saida' : '#'}" onclick="${!caixaAberto ? "alert('Caixa fechado!'); return false;" : ''}">Nova saída</a>
                            </li>
                            <li class="${path === 'estoque.html' ? 'active' : ''}">
                                <a href="${caixaAberto ? 'estoque.html' : '#'}" onclick="${!caixaAberto ? "alert('Caixa fechado!'); return false;" : ''}">Adicionar estoque</a>
                            </li>
                            <li class="${path === 'cadastro.html' ? 'active' : ''}">
                                <a href="${caixaAberto ? 'cadastro.html' : '#'}" onclick="${!caixaAberto ? "alert('Caixa fechado!'); return false;" : ''}">Cadastro de produtos</a>
                            </li>
                        </ul>
                    </li>

                    <li class="${path === 'relatorios.html' ? 'active' : ''}">
                        <a href="relatorios.html">📊 Relatórios</a>
                        ${path === 'relatorios.html' ? `
                        <ul class="sub-menu">
                            <li><a href="relatorios.html?aba=dashboard">Dashboard</a></li>
                            <li><a href="relatorios.html?aba=historico">Histórico de vendas</a></li>
                        </ul>` : ''}
                    </li>
                </ul>
            </div>
            <ul class="menu">
                <li><a href="#" id="btn-sair">➔ Sair (${usuario})</a></li>
            </ul>
        </div>
    `;

    // Ação do Botão Sair com Validação
    document.getElementById('btn-sair')?.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Consulta em tempo real o status do caixa antes de deslogar
        const checagemCaixa = await apiRequest('/caixa/status') || { aberto: false };
        
        if (checagemCaixa.aberto) {
            alert('⛔ Não é possível sair com o caixa aberto! Por favor, feche o caixa antes de fazer logout.');
            window.location.href = 'caixa.html?aba=fechar';
            return;
        }

        // Se o caixa estiver fechado, permite o logout normalmente
        localStorage.clear();
        window.location.href = 'login.html';
    });
});