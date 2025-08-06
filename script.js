document.addEventListener('DOMContentLoaded', function() {

    // URL relativa para o backend, já que frontend e backend estão no mesmo domínio na Vercel
    const backendApiEndpoint = '/api';

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
            data: document.getElementById('data').value,
            nomeCompleto: document.getElementById('nomeCompleto').value
        };

        try {
            // Usa o endpoint principal (api/index.js)
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

    // --- NOVO CÓDIGO PARA O ÁUDIO ---
    // Escuta por cliques em todo o documento para apanhar o clique no botão de áudio
    document.body.addEventListener('click', async function(e) {
        // Verifica se o elemento clicado é o nosso botão de áudio
        if (e.target && e.target.classList.contains('audio-btn')) {
            const button = e.target;
            const audioUrl = button.dataset.audioUrl;
            const audioPlayer = document.getElementById('audio-player');
            const audioContainer = document.getElementById('audio-container');

            button.textContent = 'A carregar áudio...';
            button.disabled = true;

            try {
                // Pede o áudio ao nosso backend proxy (api/getAudio.js)
                const response = await fetch(`${backendApiEndpoint}/getAudio?audioUrl=${encodeURIComponent(audioUrl)}`);

                if (!response.ok) {
                    throw new Error('Falha ao obter o áudio do nosso backend.');
                }

                // Converte a resposta em um "blob" (um ficheiro em memória)
                const audioBlob = await response.blob();
                // Cria uma URL local para este ficheiro
                const objectUrl = URL.createObjectURL(audioBlob);

                // Configura e toca o áudio
                audioPlayer.src = objectUrl;
                button.style.display = 'none'; // Esconde o botão
                audioPlayer.style.display = 'block'; // Mostra o leitor de áudio
                audioPlayer.play();

            } catch (error) {
                console.error("Erro ao carregar áudio:", error);
                if (audioContainer) {
                    audioContainer.innerHTML = `<div class="error">Falha ao carregar o áudio.</div>`;
                }
            }
        }
    });
    // --- FIM DO NOVO CÓDIGO PARA O ÁUDIO ---


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
});