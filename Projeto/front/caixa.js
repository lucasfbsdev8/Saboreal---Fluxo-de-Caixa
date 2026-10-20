// caixa.js
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const aba = params.get('aba') || 'abrir';
    
    const secAbrir = document.getElementById('secao-abrir');
    const secFechar = document.getElementById('secao-fechar');
    const titulo = document.getElementById('titulo-pagina');

    if (aba === 'fechar') {
        titulo.textContent = 'FECHAR CAIXA';
        secFechar.style.display = 'block';
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
});
