// =================================================================
// --- CONFIGURAÇÕES GLOBAIS ---
// =================================================================
const backendApiEndpoint = '/api';

// ---> PASSO MAIS IMPORTANTE <---
// Cole aqui o ID do Cliente que você criou na Google Cloud Platform.
const GOOGLE_CLIENT_ID = '827325386401-ihcn9c4j2nntknpv65io2snt51oj2bpe.apps.googleusercontent.com';

// =================================================================
// --- LÓGICA DE LOGIN COM GOOGLE ---
// =================================================================
async function handleCredentialResponse(response) {
    const loginError = document.getElementById('login-error-message');
    loginError.style.display = 'none';
    const idToken = response.credential;
    const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
    const userEmail = decodedToken.email;
    const userName = decodedToken.name;

    const isAuthorized = await verifyEmailOnBackend(userEmail);
    
    if (isAuthorized) {
        localStorage.setItem('loggedInUser', JSON.stringify({ name: userName, email: userEmail }));
        document.getElementById('user-name').textContent = userName;
        document.getElementById('login-overlay').style.display = 'none';
        document.querySelector('.app-wrapper').style.display = 'flex';
        initializeApp();
    } else {
        loginError.textContent = 'Acesso negado. O seu e-mail não tem permissão.';
        loginError.style.display = 'block';
    }
}

async function verifyEmailOnBackend(email) {
    try {
        const response = await fetch(backendApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'checkAuth', email: email })
        });
        const result = await response.json();
        return result.authorized;
    } catch (error) {
        console.error("Erro ao verificar e-mail:", error);
        document.getElementById('login-error-message').textContent = 'Erro ao verificar permissão.';
        document.getElementById('login-error-message').style.display = 'block';
        return false;
    }
}

// =================================================================
// --- INICIALIZAÇÃO DA APLICAÇÃO PRINCIPAL (SÓ CORRE APÓS LOGIN) ---
// =================================================================
function initializeApp() {
    const form = document.getElementById('transcriptionForm');
    const submitBtn = document.getElementById('submitBtn');
    const resultArea = document.getElementById('resultArea');
    const resultContent = document.getElementById('resultContent');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        setLoading(true);
        const requestPayload = {
            action: 'transcribe',
            data: document.getElementById('data').value,
            nomeCompleto: document.getElementById('nomeCompleto').value
        };
        try {
            const response = await fetch(backendApiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro desconhecido retornado pelo backend.');
            }
            showResults(result);
        } catch (error) {
            console.error('Erro no Fetch da transcrição:', error);
            showError(`Erro de comunicação com o backend. Detalhes: ${error.message}`);
        } finally {
            setLoading(false);
        }
    });

    document.body.addEventListener('click', async function(e) {
        if (e.target && e.target.classList.contains('audio-btn')) {
            const button = e.target;
            const audioUrl = button.dataset.audioUrl;
            const audioPlayer = document.getElementById('audio-player');
            const audioContainer = document.getElementById('audio-container');
            button.textContent = 'A carregar áudio...';
            button.disabled = true;
            try {
                const response = await fetch(`${backendApiEndpoint}/getAudio?audioUrl=${encodeURIComponent(audioUrl)}`);
                if (!response.ok) {
                    throw new Error('Falha ao obter o áudio do nosso backend.');
                }
                const audioBlob = await response.blob();
                const objectUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = objectUrl;
                button.style.display = 'none';
                audioPlayer.style.display = 'block';
                audioPlayer.play();
            } catch (error) {
                console.error("Erro ao carregar áudio:", error);
                if (audioContainer) {
                    audioContainer.innerHTML = `<div class="error">Falha ao carregar o áudio.</div>`;
                }
            }
        }
    });
    
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        google.accounts.id.disableAutoSelect();
        location.reload();
    });

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            submitBtn.classList.add('loading');
        } else {
            submitBtn.classList.remove('loading');
        }
    }
    
    function showResults(data) {
        const details = data.data;
        resultContent.innerHTML = `
            <div class="result-item">
                <h4>📞 Informações da Ligação</h4>
                <p><strong>Nome:</strong> ${details.nome || 'N/A'}</p>
                <p><strong>Data:</strong> ${details.data || 'N/A'}</p>
                <p><strong>Hora:</strong> ${details.hora || 'N/A'}</p>
                <p><strong>Fonte:</strong> ${details.fonte || 'N/A'}</p>
            </div>
            <div class="result-item">
                <h4>🎵 Áudio da Ligação</h4>
                <div id="audio-container">
                    <button class="btn-primary audio-btn" data-audio-url="${details.linkAudio}">Carregar e Ouvir Áudio</button>
                    <audio id="audio-player" controls style="display: none; width: 100%; margin-top: 10px;"></audio>
                </div>
            </div>
            <div class="result-item">
                <h4>📝 Transcrição Completa</h4>
                <div class="transcription-text">${details.transcricao || 'N/A'}</div>
            </div>
            <div class="result-item">
                <h4>📋 Resumo Executivo</h4>
                <div class="summary-text">${details.resumo || 'N/A'}</div>
            </div>`;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function showError(message) {
        resultContent.innerHTML = `<div class="error"><strong>Erro:</strong> ${message}</div>`;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// =================================================================
// --- PONTO DE ENTRADA PRINCIPAL ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    const googleOnloadDiv = document.getElementById('g_id_onload');
    if (googleOnloadDiv) {
        if (GOOGLE_CLIENT_ID.includes('COLE_O_SEU_CLIENT_ID_AQUI')) {
            const loginError = document.getElementById('login-error-message');
            loginError.textContent = 'ERRO DE CONFIGURAÇÃO: O Client ID do Google não foi definido no script.js.';
            loginError.style.display = 'block';
        } else {
            googleOnloadDiv.setAttribute('data-client_id', GOOGLE_CLIENT_ID);
        }
    }
});