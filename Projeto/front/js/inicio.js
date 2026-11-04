const metrica = (rotulo, valor, estilo = '', extra = '') =>
    `<div class="metric-box" ${extra}><span class="rotulo">${rotulo}</span><span class="valor" ${estilo}>${valor}</span></div>`;

const acao = (href, nomeIcone, texto, classe = '') =>
    `<a href="${href}" class="btn-action-card ${classe}"><span class="btn-icon" aria-hidden="true">${icone(nomeIcone)}</span><span>${texto}</span></a>`;

(async () => {
    const s = await obterStatusCaixa();
    const badge = document.getElementById('lbl-status-badge');
    const metricas = document.getElementById('container-metricas');
    const botoes = document.getElementById('container-botoes-acao');

    if (s.aberto) {
        badge.textContent = 'CAIXA ABERTO';
        badge.className = 'badge-status bg-aberto';
        document.getElementById('lbl-status-detalhe').textContent =
            `Aberto por ${s.caixa.operador} em ${formatarDataHora(s.caixa.data_abertura)}`;

        metricas.innerHTML =
            metrica('SALDO ATUAL (DINHEIRO)', formatarMoeda(s.saldo_dinheiro), 'style="color:#2E7D32"') +
            metrica('SALDO ATUAL (BANCO)', formatarMoeda(s.saldo_banco), 'style="color:#1565C0"') +
            metrica('VALOR ATUAL TOTAL', formatarMoeda(s.valor_atual_total));

        botoes.innerHTML =
            acao('vendas.html', 'carrinho', 'Nova venda') +
            acao('caixa.html?aba=saida', 'nova-saida', 'Nova saída') +
            acao('cadastro.html', 'cadastro', 'Cadastro de produtos') +
            acao('estoque.html', 'estoque', 'Adicionar estoque') +
            acao('relatorios.html', 'relatorios', 'Relatórios') +
            acao('caixa.html?aba=fechar', 'cadeado', 'Fechar caixa', 'btn-fechar');
    } else {
        badge.textContent = 'CAIXA FECHADO';
        badge.className = 'badge-status bg-fechado';
        metricas.innerHTML =
            metrica('SALDO ATUAL (DINHEIRO)', formatarMoeda(s.saldo_dinheiro), 'style="color:#2E7D32"') +
            metrica('SALDO ATUAL (BANCO)', formatarMoeda(s.saldo_banco), 'style="color:#1565C0"') +
            metrica('VALOR ATUAL TOTAL', formatarMoeda(s.valor_atual_total));

        botoes.innerHTML =
            acao('caixa.html?aba=abrir', 'cadeado-aberto', 'Abrir caixa', 'btn-abrir') +
            acao('relatorios.html', 'relatorios', 'Relatórios') +
            `<button type="button" id="btn-sair-card" class="btn-action-card btn-sair"><span class="btn-icon" aria-hidden="true">${icone('sair')}</span><span>Sair</span></button>`
        document.getElementById('btn-sair-card').addEventListener('click', sair);
    }
})();
