document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sidebar-container');
    if (!container) return;

    const path = window.location.pathname.split('/').pop();
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba');
    const usuario = localStorage.getItem('usuario') || 'Gerência';

    container.innerHTML = `
        <div class="sidebar">
            <div>
                <div class="brand">
                    <div style="font-size: 35px;">👨‍🍳</div>
                    <h1>SABOREAL</h1>
                    <p>BISCOITOS CASEIROS</p>
                </div>
                <ul class="menu">
                    <li class="${path === 'inicio.html' ? 'active' : ''}">
                        <a href="inicio.html">🏠 Início</a>
                    </li>
                    <li class="${path.includes('caixa') ? 'active' : ''}">
                        <a href="caixa.html">💲 Caixa</a>
                        ${path.includes('caixa') ? `
                        <ul class="sub-menu">
                            <li><a href="caixa.html?aba=abrir">Abrir caixa</a></li>
                            <li><a href="caixa.html?aba=fechar">Fechar caixa</a></li>
                            <li><a href="caixa.html?aba=fluxo">Fluxo de caixa</a></li>
                        </ul>` : ''}
                    </li>
                    <li class="${path === 'vendas.html' ? 'active' : ''}">
                        <a href="vendas.html">🛒 Vendas</a>
                        ${path === 'vendas.html' ? `
                        <ul class="sub-menu">
                            <li><a href="vendas.html">Entradas</a></li>
                            <li><a href="caixa.html?aba=saida">Saídas</a></li>
                        </ul>` : ''}
                    </li>
                    <li class="${path === 'cadastro.html' ? 'active' : ''}">
                        <a href="cadastro.html">➕ Cadastro</a>
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
                <li><a href="login.html" id="btn-sair">➔ Sair (${usuario})</a></li>
            </ul>
        </div>
    `;

    document.getElementById('btn-sair')?.addEventListener('click', () => {
        localStorage.clear();
    });
});