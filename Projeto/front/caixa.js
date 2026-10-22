let saldoAnteriorBase = 0.0;
let valorCalculadoFechamentoBase = 0.0;

document.addEventListener('DOMContentLoaded', async () => {
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

    const status = await apiRequest('/caixa/status') || {};

    if (aba === 'fechar') {
        if (titulo) titulo.textContent = 'FECHAR CAIXA';
        if (secFechar) secFechar.style.display = 'block';

        if (status.aberto) {
            const det = status.detalhes_fechamento || {};
            valorCalculadoFechamentoBase = status.valor_calculado_fechamento || 0.0;

            document.getElementById('lbl-fechar-abertura').textContent = `R$ ${(det.valor_abertura || 0).toFixed(2)}`;
            document.getElementById('lbl-fechar-vendas').textContent = `+ R$ ${(det.vendas_dinheiro || 0).toFixed(2)}`;
            document.getElementById('lbl-fechar-saidas').textContent = `- R$ ${(det.saidas_dinheiro || 0).toFixed(2)}`;
            document.getElementById('lbl-fechar-esperado').textContent = `R$ ${valorCalculadoFechamentoBase.toFixed(2)}`;
            
            const elemFechar = document.getElementById('fechar-valor');
            definirValorMoedaInput(elemFechar, valorCalculadoFechamentoBase);
            validarDivergenciaFechamento();
        }
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

        saldoAnteriorBase = status.ultimo_valor_fechamento || 0.0;
        document.getElementById('lbl-saldo-anterior').textContent = `R$ ${saldoAnteriorBase.toFixed(2)}`;
        calcularTotalAbertura();
    }

    // Abertura de Caixa -> Volta para o Início
    document.getElementById('form-abrir')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reforco = obterValorFloatInput(document.getElementById('abrir-reforco'));
        const valorTotalAbertura = saldoAnteriorBase + reforco;

        const res = await apiRequest('/caixa/abrir', 'POST', {
            operador: document.getElementById('abrir-operador').value,
            valor_abertura: valorTotalAbertura,
            observacao: document.getElementById('abrir-obs').value
        });

        if (res && res.sucesso) {
            alert('✅ Caixa aberto com sucesso!');
            setTimeout(() => { window.location.href = 'inicio.html'; }, 50);
        }
    });

    // Fechamento de Caixa -> Volta para o Início
    document.getElementById('form-fechar')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const elemVal = document.getElementById('fechar-valor');
        const valorInformado = obterValorFloatInput(elemVal);
        let obsManual = document.getElementById('fechar-obs').value;

        const diff = valorInformado - valorCalculadoFechamentoBase;

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
            setTimeout(() => { window.location.href = 'inicio.html'; }, 50);
        }
    });

    // Registrar Saída -> Volta para o Início
    document.getElementById('form-saida')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const elemVal = document.getElementById('saida-valor');
        const valorSaida = obterValorFloatInput(elemVal);

        const res = await apiRequest('/movimentacoes', 'POST', {
            tipo: 'SAIDA',
            categoria: document.getElementById('saida-categoria').value,
            descricao: document.getElementById('saida-descricao').value,
            valor: valorSaida,
            forma_pagamento: document.getElementById('saida-forma').value,
            retirado_de: document.getElementById('saida-origem').value
        });
        if (res && res.sucesso) {
            alert('✅ Saída registrada com sucesso!');
            setTimeout(() => { window.location.href = 'inicio.html'; }, 50);
        }
    });
});

function formatarMoedaMaquininha(input) {
    let apenasDigitos = input.value.replace(/\D/g, '');
    if (!apenasDigitos) {
        input.value = "R\$ 0,00";
        return;
    }
    let valorNum = parseFloat(apenasDigitos) / 100;
    input.value = valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterValorFloatInput(input) {
    if (!input) return 0.0;
    let apenasDigitos = input.value.replace(/\D/g, '');
    if (!apenasDigitos) return 0.0;
    return parseFloat(apenasDigitos) / 100;
}

function definirValorMoedaInput(input, valorFloat) {
    if (!input) return;
    input.value = (valorFloat || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularTotalAbertura() {
    const reforco = obterValorFloatInput(document.getElementById('abrir-reforco'));
    const total = saldoAnteriorBase + reforco;
    document.getElementById('lbl-total-abertura').textContent = `R$ ${total.toFixed(2)}`;
}

function validarDivergenciaFechamento() {
    const informado = obterValorFloatInput(document.getElementById('fechar-valor'));
    const diff = informado - valorCalculadoFechamentoBase;
    const badge = document.getElementById('lbl-divergencia');

    if (!badge) return;
    badge.style.display = 'block';
    if (Math.abs(diff) < 0.01) {
        badge.textContent = '✅ Caixa sem divergência';
        badge.style.backgroundColor = '#E8F5E9';
        badge.style.color = '#2E7D32';
    } else if (diff < 0) {
        badge.textContent = `⚠️ Quebra de Caixa (Falta): R$ ${Math.abs(diff).toFixed(2)}`;
        badge.style.backgroundColor = '#FFEBEE';
        badge.style.color = '#C62828';
    } else {
        badge.textContent = `ℹ️ Sobra de Caixa: R$ ${diff.toFixed(2)}`;
        badge.style.backgroundColor = '#E3F2FD';
        badge.style.color = '#1565C0';
    }
}

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