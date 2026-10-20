const API_BASE_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.mensagem || result.erro || 'Erro na requisição');
        }
        return result;
    } catch (error) {
        console.error('Erro na API:', error);
        alert(error.message);
        return null;
    }
}
