document.addEventListener('DOMContentLoaded', () => {
    carregarFluxoDRE();
    carregarVendasDetalhadas();
    carregarTopProdutos();
});

function trocarAbaRelatorio(nomeAba) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (nomeAba === 'fluxo') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-fluxo').classList.add('active');
        carregarFluxoDRE();
    } else if (nomeAba === 'vendas') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-vendas').classList.add('active');
        carregarVendasDetalhadas();
    } else if (nomeAba === 'produtos') {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('tab-produtos').classList.add('active');
        carregarTopProdutos();
    }
}

async function carregarFluxoDRE() {
    const ano = document.getElementById('select-ano-fluxo').value;
    const fluxos = await apiRequest(`/relatorios/fluxo-caixa?ano=${ano}`) || [];

    const trHeader = document.getElementById('tr-fluxo-header');
    const tbBody = document.getElementById('tb-fluxo-body');

    if (!trHeader || !tbBody) return;

    trHeader.innerHTML = '<th>Demonstrativo</th>';
    fluxos.forEach(f => {
        trHeader.innerHTML += `<th style="text-align: center;">${f.mes}</th>`;
    });

    const linhas = [
        { label: '(+) Faturamento Bruto', key: 'faturamento', cor: '#2E7D32' },
        { label: '(-) Custo Mercadorias (CPV)', key: 'custo_produtos', cor: '#C62828' },
        { label: '(=) Lucro Bruto', key: 'lucro_bruto', destaque: true },
        { label: '(-) Saídas & Despesas', key: 'despesas', cor: '#C62828' },
        { label: '(=) Lucro Líquido', key: 'lucro_liquido', destaque: true, corFinal: true }
    ];

    tbBody.innerHTML = '';
    linhas.forEach(linha => {
        let tr = `<tr><td><strong>${linha.label}</strong></td>`;
        fluxos.forEach(f => {
            const val = f[linha.key];
            const fmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let style = '';
            if (linha.destaque) style += 'font-weight: bold; ';
            if (linha.cor) style += `color: ${linha.cor}; `;
            if (linha.corFinal) style += val >= 0 ? 'color: green;' : 'color: red;';

            tr += `<td style="text-align: right; ${style}">${fmt}</td>`;
        });
        tr += `</tr>`;
        tbBody.innerHTML += tr;
    });
}

async function carregarVendasDetalhadas() {
    const inicio = document.getElementById('filtro-data-inicio').value;
    const fim = document.getElementById('filtro-data-fim').value;

    let url = '/relatorios/vendas-detalhado';
    if (inicio && fim) {
        url += `?inicio=${inicio}&fim=${fim}`;
    }

    const vendas = await apiRequest(url) || [];
    const tbody = document.getElementById('tb-vendas-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma venda registrada no período.</td></tr>';
        return;
    }

    vendas.forEach(v => {
        const dataFmt = new Date(v.data_venda).toLocaleString('pt-BR');
        const valFmt = v.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        tbody.innerHTML += `
            <tr>
                <td>#${v.id}</td>
                <td>${dataFmt}</td>
                <td>${v.descricao_itens || '-'}</td>
                <td>${v.forma_pagamento}</td>
                <td><strong>${valFmt}</strong></td>
            </tr>
        `;
    });
}

async function carregarTopProdutos() {
    const tops = await apiRequest('/relatorios/top-produtos') || [];
    const tbody = document.getElementById('tb-top-produtos');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (tops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum produto vendido até o momento.</td></tr>';
        return;
    }

    tops.forEach(p => {
        const fatFmt = p.faturamento_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        tbody.innerHTML += `
            <tr>
                <td>${p.codigo}</td>
                <td><strong>${p.nome}</strong></td>
                <td>${p.total_vendido} un.</td>
                <td style="color: #2E7D32; font-weight: bold;">${fatFmt}</td>
            </tr>
        `;
    });
}

async function resetarDadosTeste() {
    const confirmacao = confirm("⚠️ ATENÇÃO!\n\nVocê está prestes a APAGAR todos os dados de vendas, saídas e caixas do sistema.\n\nEsta ação é irreversível e deve ser feita APENAS antes de entregar ao cliente.\n\nDeseja continuar?");
    
    if (confirmacao) {
        const res = await apiRequest('/admin/resetar-dados', 'POST');
        if (res && res.sucesso) {
            alert("✅ Todos os dados de teste foram apagados! O sistema está limpo para o cliente.");
            window.location.reload();
        } else {
            alert("❌ Erro ao resetar dados.");
        }
    }
}