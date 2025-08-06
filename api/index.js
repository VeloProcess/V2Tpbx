// Importa a biblioteca do Google
const { google } = require('googleapis');

/**
 * Esta é a nossa Função Serverless.
 * A Vercel executa esta função para cada pedido recebido.
 * @param {object} req - O objeto do pedido (request).
 * @param {object} res - O objeto da resposta (response).
 */
export default async function handler(req, res) {
    // ---- Configuração do CORS ----
    // Estes cabeçalhos dizem ao navegador que é seguro o seu frontend
    // comunicar com este backend.
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite qualquer origem
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Se o pedido for um OPTIONS (a verificação do navegador), apenas respondemos OK.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ---- Lógica Principal do Backend ----
    try {
        // Pega os dados enviados pelo frontend
        const { data, nomeCompleto } = req.body;

        // Validação simples
        if (!data || !nomeCompleto) {
            return res.status(400).json({ success: false, error: 'Dados insuficientes.' });
        }

        // ---- Autenticação com o Google ----
        // Lê as credenciais secretas a partir das variáveis de ambiente da Vercel
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const spreadsheetId = process.env.SPREADSHEET_ID;

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // ---- Leitura da Planilha ----
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'report_02!A:G', // Nome da aba e colunas
        });

        const rows = response.data.values || [];
        const dataNormalizada = normalizeDate(data);
        const nomeNormalizado = normalizeText(nomeCompleto);

        // ---- Lógica de Busca ----
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const nomeAtendente = row[2];
            const dataLigacao = row[5];

            if (normalizeText(nomeAtendente).includes(nomeNormalizado) && normalizeDate(dataLigacao) === dataNormalizada) {
                const resultado = {
                    nome: nomeAtendente,
                    data: formatDate(dataLigacao),
                    hora: row[6] || 'N/A',
                    linkAudio: row[1],
                    transcricao: 'Transcrição simulada da chamada via Vercel.',
                    resumo: '**Resumo:** Cliente contactou sobre faturação. Problema resolvido com sucesso.',
                    fonte: 'Planilha 55PBX (Backend Vercel)'
                };
                
                // Retorna a resposta de sucesso com os dados encontrados
                return res.status(200).json({ success: true, data: resultado });
            }
        }
        
        // Se o loop terminar e não encontrar nada, retorna erro 404
        return res.status(404).json({ success: false, error: 'Ligação não encontrada' });

    } catch (error) {
        console.error("Erro na Função Serverless:", error.message);
        // Em caso de qualquer outro erro, retorna um erro de servidor
        return res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
    }
}


// --- Funções Auxiliares ---
function normalizeText(text) { if (!text) return ''; return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function formatDate(dateStr) { if (!dateStr) return dateStr; const parts = dateStr.split('-'); if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; return dateStr; }
function normalizeDate(dateStr) {
  if (!dateStr) return '';
  const dateString = dateStr.toString().trim();
  const matchYMD = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  if (matchYMD) return dateString;
  const matchDMY = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchDMY) return `${matchDMY[3]}-${matchDMY[2]}-${matchDMY[1]}`;
  return dateString;
}