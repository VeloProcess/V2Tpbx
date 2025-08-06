// api/getAudio.js

// Esta função atuará como nosso intermediário seguro.
export default async function handler(req, res) {
    // Cabeçalhos CORS para permitir a comunicação
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 1. Pega o link do áudio que o frontend enviou
        const { audioUrl } = req.query;
        if (!audioUrl) {
            return res.status(400).json({ error: 'URL do áudio não fornecida.' });
        }

        // 2. Pega a chave de API secreta das variáveis de ambiente
        const apiKey = process.env.API_55PBX_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Chave de API não configurada no backend.' });
        }

        // 3. Faz o pedido autenticado ao servidor da 55PBX
        // Nota: A forma de autenticação pode variar. 'Authorization: Bearer' é comum.
        // Verifique a documentação da 55PBX se este método não funcionar.
        const audioResponse = await fetch(audioUrl, {
            headers: {
                // Assumindo que a autenticação é feita com um cabeçalho 'Authorization'
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!audioResponse.ok) {
            throw new Error(`Falha ao buscar o áudio do servidor 55PBX: ${audioResponse.statusText}`);
        }

        // 4. Pega o áudio e envia de volta para o frontend
        const audioBuffer = await audioResponse.arrayBuffer();
        const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';

        res.setHeader('Content-Type', contentType);
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("Erro no proxy de áudio:", error);
        res.status(500).json({ error: 'Falha ao processar o pedido de áudio.' });
    }
}