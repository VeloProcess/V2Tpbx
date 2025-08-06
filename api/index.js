// api/index.js

const { google } = require('googleapis');

/**
 * Esta é a nossa Função Serverless principal.
 * Ela decide o que fazer com base no pedido do frontend.
 * @param {object} req - O objeto do pedido (request).
 * @param {object} res - O objeto da resposta (response).
 */
export default async function handler(req, res) {
    // Configuração do CORS para permitir a comunicação com o frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde OK para o pedido de verificação do navegador
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Pega os dados enviados pelo frontend
        const { action, email, data, nomeCompleto } = req.body;

        // --- Autenticação com o Google Sheets ---
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        // --- LÓGICA DE ROTAS: Decide o que fazer com base na 'action' ---
        
        if (action === 'checkAuth') {
            // TAREFA 1: VERIFICAR E-MAIL DE LOGIN
            if (!email) {
                return res.status(400).json({ authorized: false, error: 'E-mail não fornecido.' });
            }

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Usuarios!A:A', // Lê a coluna A da aba Usuarios
            });

            // Transforma a lista de listas numa lista simples de e-mails
            // e converte tudo para minúsculas para uma comparação segura.
            const allowedEmails = response.data.values.flat().map(e => e.toLowerCase()); 
            const isAuthorized = allowedEmails.includes(email.toLowerCase());
            
            return res.status(200).json({ authorized: isAuthorized });

        } else if (action === 'transcribe') {
            // TAREFA 2: BUSCAR DADOS DA TRANSCRIÇÃO
            if (!data || !nomeCompleto) {
                return res.status(400).json({ success: false, error: 'Dados insuficientes.' });
            }
            
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'report_02!A:G',
            });
            const rows = response.data.values || [];
            const dataNormalizada = normalizeDate(data);
            const nomeNormalizado = normalizeText(nomeCompleto);

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (normalizeText(row[2]).includes(nomeNormalizado) && normalizeDate(row[5]) === dataNormalizada) {
                    const resultado = {
                        nome: row[2],
                        data: formatDate(row[5]),
                        hora: row[6] || 'N/A',
                        linkAudio: row[1],
                        transcricao: 'Transcrição simulada da chamada via Vercel.',
                        resumo: '**Resumo:** Cliente contactou sobre faturação. Problema resolvido com sucesso.',
                        fonte: 'Planilha 55PBX (Backend Vercel)'
                    };
                    return res.status(200).json({ success: true, data: resultado });
                }
            }
            return res.status(404).json({ success: false, error: 'Ligação não encontrada' });
        
        } else {
            return res.status(400).json({ error: 'Ação desconhecida.' });
        }

    } catch (error) {
        console.error("Erro na Função Serverless (api/index.js):", error.message);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

// --- Funções Auxiliares ---
function normalizeText(text) { if (!text) return ''; return text.toString().toLowerCase().normalize('NFD').replace(/[\u0000-\u001f]/g, '').trim(); }
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