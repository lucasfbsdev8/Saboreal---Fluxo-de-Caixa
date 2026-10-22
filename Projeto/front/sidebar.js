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
                    <img src="imagens/logo.png" alt="Logo Saboreal" style="width: 50px; height: auto; margin-bottom: 5px;">
                    <h1>SABOREAL</h1>
                    <p>BISCOITOS CASEIROS</p>
                </div>
                <ul class="menu">
                    <li class="${path === 'inicio.html' ? 'active' : ''}">
                        <a href="inicio.html"><svg class="icone" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> Início</a>
                    </li>
                    <li class="${path.includes('caixa') ? 'active' : ''}">
                        <a href="caixa.html"><svg class="icone" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> Caixa</a>
                        ${path.includes('caixa') ? `
                        <ul class="sub-menu">
                            <li><a href="caixa.html?aba=abrir">Abrir caixa</a></li>
                            <li><a href="caixa.html?aba=fechar">Fechar caixa</a></li>
                            <li><a href="caixa.html?aba=fluxo">Fluxo de caixa</a></li>
                        </ul>` : ''}
                    </li>
                    <li class="${path === 'vendas.html' ? 'active' : ''}">
                        <a href="vendas.html"><svg class="icone" viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> Vendas</a>
                        ${path === 'vendas.html' ? `
                        <ul class="sub-menu">
                            <li><a href="vendas.html">Entradas</a></li>
                            <li><a href="caixa.html?aba=saida">Saídas</a></li>
                        </ul>` : ''}
                    </li>
                    <li class="${path === 'cadastro.html' ? 'active' : ''}">
                        <a href="cadastro.html"><svg class="icone" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 12v6"/><path d="M9 15h6"/></svg> Cadastro</a>
                    </li>
                    <li class="${path === 'relatorios.html' ? 'active' : ''}">
                        <a href="relatorios.html"><svg class="icone" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> Relatórios</a>
                        ${path === 'relatorios.html' ? `
                        <ul class="sub-menu">
                            <li><a href="relatorios.html?aba=dashboard">Dashboard</a></li>
                            <li><a href="relatorios.html?aba=historico">Histórico de vendas</a></li>
                        </ul>` : ''}
                    </li>
                </ul>
            </div>
            <ul class="menu">
                <li><a href="login.html" id="btn-sair"><svg class="icone" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg> Sair (${usuario})</a></li>
            </ul>
        </div>
    `;

    document.getElementById('btn-sair')?.addEventListener('click', () => {
        localStorage.clear();
    });
});