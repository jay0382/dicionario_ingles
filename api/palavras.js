const { Pool } = require('pg');
const useragent = require('useragent');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== FUNÇÕES DE LOG ==========

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] ||
         'IP não detectado';
}

function getClientInfo(userAgentString) {
  try {
    const agent = useragent.parse(userAgentString);
    return {
      os: agent.os.toString(),
      browser: agent.toAgent()
    };
  } catch {
    return { os: 'Desconhecido', browser: 'Desconhecido' };
  }
}

async function registrarLog(acao, palavraIngles, palavraPortugues, req) {
  const ip = getClientIP(req);
  const userAgentString = req.headers['user-agent'] || '';
  const { os, browser } = getClientInfo(userAgentString);
  
  try {
    await pool.query(
      `INSERT INTO logs (acao, palavra_ingles, palavra_portugues, ip, user_agent, os, browser) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [acao, palavraIngles, palavraPortugues, ip, userAgentString, os, browser]
    );
    console.log(`📝 Log: ${acao} - ${palavraIngles} - ${ip}`);
  } catch (err) {
    console.error('Erro ao registrar log:', err.message);
  }
}

// ========== HANDLER PRINCIPAL ==========

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rota de logs (protegida)
  if (req.method === 'GET' && req.url === '/api/logs') {
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    
    try {
      const result = await pool.query('SELECT * FROM logs ORDER BY created_at DESC LIMIT 200');
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar logs' });
    }
  }

  try {
    // GET todas as palavras
    if (req.method === 'GET') {
      const result = await pool.query(`
        SELECT palavra_id as id, portugues, ingles, pronunciacao 
        FROM palavras 
        ORDER BY ingles
      `);
      return res.status(200).json(result.rows);
    }

    // POST - criar palavra (COM LOG)
    if (req.method === 'POST') {
      const { portugues, ingles, pronunciacao } = req.body;
      const palavra_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      
      await pool.query(
        'INSERT INTO palavras (palavra_id, portugues, ingles, pronunciacao) VALUES ($1, $2, $3, $4)',
        [palavra_id, portugues, ingles, pronunciacao]
      );
      
      await registrarLog('ADICIONOU', ingles, portugues, req);
      
      return res.status(201).json({ id: palavra_id, portugues, ingles, pronunciacao });
    }

    // PUT - editar (COM LOG)
    if (req.method === 'PUT') {
      const { portugues, ingles, pronunciacao } = req.body;
      const id = req.url.split('/')[2];
      
      const oldWord = await pool.query('SELECT ingles, portugues FROM palavras WHERE palavra_id = $1', [id]);
      
      await pool.query(
        'UPDATE palavras SET portugues = $1, ingles = $2, pronunciacao = $3 WHERE palavra_id = $4',
        [portugues, ingles, pronunciacao, id]
      );
      
      const logIngles = `${oldWord.rows[0]?.ingles || '?'} → ${ingles}`;
      const logPortugues = `${oldWord.rows[0]?.portugues || '?'} → ${portugues}`;
      await registrarLog('RENOMEOU', logIngles, logPortugues, req);
      
      return res.status(200).json({ message: 'Atualizado' });
    }

    // DELETE - excluir (COM LOG)
    if (req.method === 'DELETE') {
      const id = req.url.split('/')[2];
      
      const word = await pool.query('SELECT ingles, portugues FROM palavras WHERE palavra_id = $1', [id]);
      
      await pool.query('DELETE FROM palavras WHERE palavra_id = $1', [id]);
      
      await registrarLog('EXCLUIU', word.rows[0]?.ingles, word.rows[0]?.portugues, req);
      
      return res.status(200).json({ message: 'Removido' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
    
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};