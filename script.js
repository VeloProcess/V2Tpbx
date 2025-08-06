// =================================================================
// --- CONFIGURAÇÕES GLOBAIS ---
// =================================================================

// URL relativa para o backend no mesmo domínio (Vercel)
const backendApiEndpoint = '/api';

// ---> PASSO IMPORTANTE <---
// Cole aqui o ID do Cliente que você criou na Google Cloud Platform.
const GOOGLE_CLIENT_ID = '827325386401-ihcn9c4j2nntknpv65io2snt51oj2bpe.apps.googleusercontent.com';


// =================================================================
// --- LÓGICA DE LOGIN COM GOOGLE ---
// =================================================================

/**
 * Esta função é chamada automaticamente pela biblioteca do Google
 * após o utilizador fazer o login com sucesso na janela popup.
 * @param {object} response - Contém o token de credencial do utilizador.
 */
async function handleCredentialResponse(response) {
    const loginError = document.getElementById('login-error-message');
    loginError.style.display = 'none';

    // response.credential é um token JWT que contém as informações do utilizador
    const idToken = response.credential;
    
    // Decodificamos o token para obter o e-mail (isto é seguro de se fazer no frontend)
    const decodedToken = JSON.parse(atob(idToken.split('.')[1]));
    const userEmail = decodedToken.email;
    
    // Verificamos se o e-mail tem permissão no nosso backend
    const isAuthorized = await verifyEmailOnBackend(userEmail);
    
    if (isAuthorized) {
        // Se autorizado, esconde a tela de login e mostra a aplicação
        document.getElementById('login-overlay').style.display = 'none';
        document.querySelector('.app-container').style.display = 'block';
        initializeApp(); // Chama a função que "liga" a nossa aplicação principal
    } else {
        // Se não for autorizado, mostra uma mensagem de erro
        loginError.textContent = 'Acesso negado. O seu e-mail não tem permissão para usar esta aplicação.';
        loginError.style.display = 'block';
    }
}

/**
 * Envia o e-mail do utilizador para o nosso backend para verificar se ele está na lista
 * de permissões na Planilha Google.
 * @param {string} email - O e-mail do utilizador que fez login.
 * @returns {boolean} - Retorna true se autorizado, false caso contrário.
 */
async function verifyEmailOnBackend(email) {
    try {
        const response = await fetch(backendApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'checkAuth', // A nova ação que criámos no backend
                email: email
            })
        });
        const result = await response.json();
        return result.authorized;
    } catch (error) {
        console.error("Erro ao verificar e-mail:", error);
        const loginError = document.getElementById('login-error-message');
        loginError.textContent = 'Erro de comunicação com o servidor ao verificar permissão.';
        loginError.style.display = 'block';
        return false;
    }
}


// =================================================================
// --- INICIALIZAÇÃO DA APLICAÇÃO PRINCIPAL (SÓ CORRE APÓS LOGIN) ---
// =================================================================

function initializeApp() {
    // Mapeamento dos elementos da página
    const form = document.getElementById('transcriptionForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.querySelector('.btn-text');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const resultArea = document.getElementById('resultArea');
    const resultContent = document.getElementById('resultContent');

    // Evento de Envio do Formulário de Transcrição
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        setLoading(true);
        
        const requestPayload = {
            action: 'transcribe', // Define a ação para o backend
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

    // Lógica para o botão de áudio
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

    // Funções Auxiliares
    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        btnText.style.display = isLoading ? 'none' : 'block';
        loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }
    
    function showResults(data) {
        const details = data.data;
        let html = `
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
            </div>
        `;
        
        resultContent.innerHTML = html;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    function showError(message) {
        resultContent.innerHTML = `<div class="error"><strong>Erro:</strong> ${message}</div>`;
        resultArea.style.display = 'block';
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }
}


// =================================================================
// --- PONTO DE ENTRADA PRINCIPAL ---
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Configura o Client ID para o botão do Google assim que a página carrega
    const googleOnloadDiv = document.getElementById('g_id_onload');
    if (googleOnloadDiv) {
        if (GOOGLE_CLIENT_ID.includes('COLE_O_SEU_CLIENT_ID_AQUI')) {
            const loginError = document.getElementById('login-error-message');
            loginError.textContent = 'ERRO DE CONFIGURAÇÃO: O Client ID do Google não foi definido no script.js.';
            loginError.style.display = 'block';
        } else {
            googleOnloadDiv.setAttribute('data-client_id', GOOGLE_CLIENT_ID);
        }
    } else {
        console.error("Elemento 'g_id_onload' não encontrado. Verifique o seu HTML.");
    }
});