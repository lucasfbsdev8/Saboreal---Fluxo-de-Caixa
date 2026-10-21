document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba') || 'abrir';
    
    const secAbrir = document.getElementById('secao-abrir');
    const secFechar = document.getElementById('secao-fechar');
    const secSaida = document.getElementById('secao-saida');
    const secFluxo = document.getElementById('secao-fluxo');
    const titulo = document.getElementById('titulo-pagina');

    if (secAbrir) secAbrir.style.display = 'none';
    if (secFechar) secFechar.style.display = 'none';
    if (secSaida) secSaida.style.display = 'none';
    if (secFluxo) secFluxo.style.display = 'none';

    if (aba === 'fechar') {
        if (titulo) titulo.textContent = 'FECHAR CAIXA';
        if (secFechar) secFechar.style.display = 'block';
    } else if (aba === 'saida') {
        if (titulo) titulo.textContent = 'REGISTRAR SAÍDA';
        if (secSaida) secSaida.style.display = 'block';
    } else if (aba === 'fluxo') {
        if (titulo) titulo.textContent = 'FLUXO DE CAIXA';
        if (secFluxo) secFluxo.style.display = 'block';
        carregarFluxoCaixa();
    } else {
        if (titulo) titulo.textContent = 'ABRIR CAIXA';
        if (secAbrir) secAbrir.style.display = 'block';
    }

    document.getElementById('form-fechar')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const valorInformado = parseFloat(document.getElementById('fechar-valor').value);
        let obsManual = document.getElementById('fechar-obs').value;

        const status = await apiRequest('/caixa/status') || {};
        const valorEsperado = status.valor_calculado_fechamento || 0.0;
        const diff = valorInformado - valorEsperado;

        let obsFinal = obsManual;
        if (Math.abs(diff) >= 0.01) {
            const tipoDiv = diff < 0 ? `Quebra: -R$ ${Math.abs(diff).toFixed(2)}` : `Sobra: +R$ ${diff.toFixed(2)}`;
            obsFinal = obsManual ? `${obsManual} | ${tipoDiv}` : tipoDiv;
        }

        const res = await apiRequest('/caixa/fechar', 'POST', {
            valor_fechamento: valorInformado,
            observacao: obsFinal
        });
        if (res && res.sucesso) {
            alert('✅ Caixa fechado com sucesso!');
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
            alert('✅ Saída registrada com sucesso!');
            window.location.href = 'inicio.html';
        }
    });
});

async function carregarFluxoCaixa() {
    const fluxos = await apiRequest('/caixa/fluxo') || [];
    const trHeader = document.getElementById('tr-header-fluxo');
    const tbBody = document.getElementById('tb-body-fluxo');

    if (!trHeader || !tbBody || fluxos.length === 0) return;

    trHeader.innerHTML = '<th>Fluxo de caixa</th>';
    fluxos.forEach(f => {
        trHeader.innerHTML += `<th>${f.mes}</th>`;
    });

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