Chart.register(ChartDataLabels);

let chart1, chart2, chart3;
let periodoAtual = 'mes';

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba') || 'dashboard';

    alternarAbaRelatorio(aba);
});

function alternarAbaRelatorio(aba) {
    const dash = document.getElementById('visao-dashboard');
    const hist = document.getElementById('visao-historico');
    const titulo = document.getElementById('titulo-relatorios');

    if (aba === 'historico') {
        dash.style.display = 'none';
        hist.style.display = 'block';
        titulo.textContent = 'Histórico de vendas';
        carregarHistoricoVendas();
    } else {
        dash.style.display = 'block';
        hist.style.display = 'none';
        titulo.textContent = 'Relatório financeiro';
        carregarRelatorios(periodoAtual);
    }
}

async function carregarHistoricoVendas() {
    const vendas = await apiRequest('/vendas/historico') || [];
    const tbody = document.getElementById('tb-historico-vendas');
    tbody.innerHTML = '';

    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Nenhuma venda registrada ainda.</td></tr>';
        return;
    }

    vendas.forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td>${v.hora}</td>
                <td>${v.itens}</td>
                <td>${v.forma_pagamento}</td>
                <td>R$ ${v.total.toFixed(2)}</td>
            </tr>
        `;
    });
}

async function carregarRelatorios(periodo = 'mes') {
    periodoAtual = periodo;
    const dados = await apiRequest(`/dashboard/resumo?periodo=${periodo}`);
    
    if (dados) {
        const entradas = dados.faturamento_hoje || 0;
        const saidas = dados.saidas || 0;
        const saldo = dados.saldo || 0;

        document.getElementById('card-entradas').textContent = `R$ ${entradas.toFixed(2)}`;
        document.getElementById('card-saidas').textContent = `R$ ${saidas.toFixed(2)}`;
        document.getElementById('card-saldo').textContent = `R$ ${saldo.toFixed(2)}`;

        const fp = dados.formas_pagamento || {};
        document.getElementById('val-dinheiro').textContent = `R$ ${(fp.Dinheiro || 0).toFixed(2)}`;
        document.getElementById('val-pix').textContent = `R$ ${(fp.PIX || 0).toFixed(2)}`;
        document.getElementById('val-credito').textContent = `R$ ${(fp.Crédito || 0).toFixed(2)}`;
        document.getElementById('val-debito').textContent = `R$ ${(fp.Débito || 0).toFixed(2)}`;

        renderizarGraficos(fp);
    }
}

function renderizarGraficos(formasPagamento) {
    // 1. Gráfico Entradas x Saídas por Mês
    const ctx1 = document.getElementById('chartEntradasSaidas').getContext('2d');
    if (chart1) chart1.destroy();
    chart1 = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: ['Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro'],
            datasets: [
                { label: 'Entradas', data: [15328, 13890, 13406, 14355, 14050, 15128], backgroundColor: '#4CAF50' },
                { label: 'Saídas', data: [6195, 6047, 5963, 6109, 6096, 5931], backgroundColor: '#F44336' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, datalabels: { display: false } }
        }
    });

    // 2. Gráfico Evolução do Saldo
    const ctx2 = document.getElementById('chartEvolucaoSaldo').getContext('2d');
    if (chart2) chart2.destroy();
    chart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Abril (+50%)', 'Maio (+31%)', 'Junho (+33%)', 'Julho (+43%)', 'Agosto (+39%)', 'Setembro (+51%)'],
            datasets: [{ label: 'Saldo Acumulado', data: [9132, 7842, 7442, 8245, 7954, 9196], backgroundColor: '#2E7D32' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, datalabels: { display: false } }
        }
    });

    // 3. Gráfico de Rosca Dinâmico conforme o Filtro Selecionado
    const valuesFormas = [
        formasPagamento.Dinheiro || 0,
        formasPagamento.PIX || 0,
        formasPagamento.Crédito || 0,
        formasPagamento.Débito || 0
    ];

    const ctx3 = document.getElementById('chartFormasPagamento').getContext('2d');
    if (chart3) chart3.destroy();
    chart3 = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['Dinheiro', 'PIX', 'Crédito', 'Débito'],
            datasets: [{
                data: valuesFormas,
                backgroundColor: ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800'],
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    display: true,
                    color: '#FFFFFF',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value, ctx) => {
                        const dataset = ctx.chart.data.datasets[0];
                        const total = dataset.data.reduce((acc, current) => acc + current, 0);
                        if (total === 0) return '0%';
                        return Math.round((value / total) * 100) + '%';
                    }
                }
            }
        }
    });
}

function filtrarPeriodo(periodo, el) {
    const botoes = document.querySelectorAll('.btn-filtro');
    botoes.forEach(btn => btn.classList.remove('active'));
    
    if (el) {
        el.classList.add('active');
    }
    
    carregarRelatorios(periodo);
}