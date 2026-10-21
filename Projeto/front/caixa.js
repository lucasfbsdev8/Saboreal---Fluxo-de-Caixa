document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba') || 'abrir';
    
    const secAbrir = document.getElementById('secao-abrir');
    const secFechar = document.getElementById('secao-fechar');
    const secSaida = document.getElementById('secao-saida');
    const secFluxo = document.getElementById('secao-fluxo');
    const titulo = document.getElementById('titulo-pagina');

    secAbrir.style.display = 'none';
    secFechar.style.display = 'none';
    secSaida.style.display = 'none';
    secFluxo.style.display = 'none';

    if (aba === 'fechar') {
        titulo.textContent = 'FECHAR CAIXA';
        secFechar.style.display = 'block';
    } else if (aba === 'saida') {
        titulo.textContent = 'REGISTRAR SAÍDA';
        secSaida.style.display = 'block';
    } else if (aba === 'fluxo') {
        titulo.textContent = 'FLUXO DE CAIXA';
        secFluxo.style.display = 'block';
        carregarFluxoCaixa();
    } else {
        titulo.textContent = 'ABRIR CAIXA';
        secAbrir.style.display = 'block';
    }

    document.getElementById('form-abrir')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await apiRequest('/caixa/abrir', 'POST', {
            operador: document.getElementById('abrir-operador').value,
            valor_abertura: parseFloat(document.getElementById('abrir-valor').value),
            observacao: document.getElementById('abrir-obs').value
        });
        if (res && res.sucesso) {
            alert('Caixa aberto!');
            window.location.href = 'vendas.html';
        }
    });

    document.getElementById('form-fechar')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await apiRequest('/caixa/fechar', 'POST', {
            valor_fechamento: parseFloat(document.getElementById('fechar-valor').value),
            observacao: document.getElementById('fechar-obs').value
        });
        if (res && res.sucesso) {
            alert('Caixa fechado com sucesso!');
            window.location.href = 'inicio.html';
        }
    });

    document.getElementById('form-saida')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await apiRequest('/movimentacoes', 'POST', {
            tipo: 'SAIDA',
            categoria: document.getElementById('saida-categoria').value,
            descricao: document.getElementById('saida-descricao').value,
            valor: parseFloat(document.getElementById('saida-valor').value),
            forma_pagamento: document.getElementById('saida-forma').value,
            retirado_de: document.getElementById('saida-origem').value
        });
        if (res && res.sucesso) {
            alert('Saída registrada com sucesso!');
            window.location.href = 'vendas.html';
        }
    });
});

async function carregarFluxoCaixa() {
    const fluxos = await apiRequest('/caixa/fluxo') || [];
    const trHeader = document.getElementById('tr-header-fluxo');
    const tbBody = document.getElementById('tb-body-fluxo');

    if (fluxos.length === 0) return;

    // Preenche cabeçalho de meses
    fluxos.forEach(f => {
        trHeader.innerHTML += `<th>${f.mes}</th>`;
    });

    // Monta as linhas de dados do protótipo
    const linhas = [
        { label: 'Lucro', key: 'lucro', destaque: true },
        { label: 'Saldo Final', key: 'saldo' },
        { label: 'Saldo Inicial', key: 'saldo_inicial' },
        { label: 'Entradas', key: 'entradas' },
        { label: 'Saídas', key: 'saidas' }
    ];

    tbBody.innerHTML = '';
    linhas.forEach(linha => {
        let tr = `<tr><td><strong>${linha.label}</strong></td>`;
        fluxos.forEach(f => {
            const valor = f[linha.key].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            tr += `<td ${linha.destaque ? 'style="font-weight:bold; color:green;"' : ''}>${valor}</td>`;
        });
        tr += `</tr>`;
        tbBody.innerHTML += tr;
    });
}