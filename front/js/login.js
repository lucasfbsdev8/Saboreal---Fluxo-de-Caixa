if (Sessao.logado()) location.replace('inicio.html');

document.getElementById('form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const botao = e.target.querySelector('button[type="submit"]');
    botao.disabled = true;

    const res = await apiRequest('/login', 'POST', {
        usuario: document.getElementById('usuario').value.trim(),
        senha: document.getElementById('senha').value,
    }, { semRedirecionar: true });

    if (res && res.sucesso) {
        Sessao.salvar(res);
        location.href = 'inicio.html';
    } else {
        botao.disabled = false;
        document.getElementById('senha').select();
    }
});
