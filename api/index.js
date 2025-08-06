// api/index.js
const { google } = require('googleapis');

export default async function handler(req, res) {
    // Configuração do CORS (essencial)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, email, data, nomeCompleto } = req.body;

        // ---- Autenticação com o Google Sheets ----
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        // --- LÓGICA DE ROTAS: Decide o que fazer com base na 'action' ---
        
        if (action === 'checkAuth') {
            // TAREFA 1: VERIFICAR E-MAIL
            if (!email) return res.status(400).json({ authorized: false, error: 'E-mail não fornecido.' });

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Usuarios!A:A', // Lê a coluna A da aba Usuarios
            });

            const allowedEmails = response.data.values.flat(); // Transforma a lista de listas numa lista simples
            const isAuthorized = allowedEmails.includes(email);
            
            return res.status(200).json({ authorized: isAuthorized });

        } else if (action === 'transcribe') {
            // TAREFA 2: BUSCAR TRANSCRIÇÃO (código que já tínhamos)
            if (!data || !nomeCompleto) return res.status(400).json({ success: false, error: 'Dados insuficientes.' });
            
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
                    const resultado = { /* ... (mesma lógica de antes) ... */ };
                    return res.status(200).json({ success: true, data: { nome: row[2], data: formatDate(row[5]), hora: row[6] || 'N/A', linkAudio: row[1], transcricao: 'Transcrição simulada.', resumo: 'Resumo simulado.', fonte: 'Planilha 55PBX (Backend Vercel)' } });
                }
            }
            return res.status(404).json({ success: false, error: 'Ligação não encontrada' });
        
        } else {
            return res.status(400).json({ error: 'Ação desconhecida.' });
        }

    } catch (error) {
        console.error("Erro na Função Serverless:", error.message);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

// --- Funções Auxiliares (sem alterações) ---
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