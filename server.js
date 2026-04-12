require('dotenv').config();
const useragent = require('useragent');
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Conexão com NeonDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ========== FUNÇÕES DE LOG ==========

// Função para pegar IP real (funciona no Vercel também)
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'IP não detectado';
}

// Função para detectar OS e Browser
function getClientInfo(userAgentString) {
  try {
    const agent = useragent.parse(userAgentString);
    return {
      os: agent.os.toString(),
      browser: agent.toAgent()
    };
  } catch (err) {
    return { os: 'Desconhecido', browser: 'Desconhecido' };
  }
}

// Função para registrar log
async function registrarLog(acao, palavraIngles, palavraPortugues, req) {
  const ip = getClientIP(req);
  const userAgentString = req.headers['user-agent'] || '';
  const { os, browser } = getClientInfo(userAgentString);
  
  try {
    await pool.query(
      'INSERT INTO logs (acao, palavra_ingles, palavra_portugues, ip, user_agent, os, browser) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [acao, palavraIngles, palavraPortugues, ip, userAgentString, os, browser]
    );
    console.log(`📝 Log registrado: ${acao} - ${palavraIngles} - ${ip}`);
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}

// ========== ROTAS DA API ==========

// Buscar todas as palavras
app.get('/api/palavras', async (req, res) => {
  try {
    const result = await pool.query('SELECT palavra_id as id, portugues, ingles, pronunciacao FROM palavras ORDER BY ingles');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar palavras' });
  }
});

// Adicionar palavra (COM LOG)
app.post('/api/palavras', async (req, res) => {
  try {
    const { portugues, ingles, pronunciacao } = req.body;
    const palavra_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    await pool.query(
      'INSERT INTO palavras (palavra_id, portugues, ingles, pronunciacao) VALUES ($1, $2, $3, $4)',
      [palavra_id, portugues, ingles, pronunciacao]
    );
    
    // Registrar log
    await registrarLog('ADICIONOU', ingles, portugues, req);
    
    res.status(201).json({ id: palavra_id, portugues, ingles, pronunciacao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar' });
  }
});

// Editar palavra (COM LOG)
app.put('/api/palavras/:id', async (req, res) => {
  try {
    const { portugues, ingles, pronunciacao } = req.body;
    const { id } = req.params;
    
    // Buscar palavra antiga para o log
    const oldWord = await pool.query('SELECT ingles, portugues FROM palavras WHERE palavra_id = $1', [id]);
    
    await pool.query(
      'UPDATE palavras SET portugues = $1, ingles = $2, pronunciacao = $3 WHERE palavra_id = $4',
      [portugues, ingles, pronunciacao, id]
    );
    
    // Registrar log
    const logIngles = `${oldWord.rows[0]?.ingles || '?'} → ${ingles}`;
    const logPortugues = `${oldWord.rows[0]?.portugues || '?'} → ${portugues}`;
    await registrarLog('RENOMEOU', logIngles, logPortugues, req);
    
    res.json({ message: 'Atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao editar' });
  }
});

// Excluir palavra (COM LOG)
app.delete('/api/palavras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar palavra para o log
    const word = await pool.query('SELECT ingles, portugues FROM palavras WHERE palavra_id = $1', [id]);
    
    await pool.query('DELETE FROM palavras WHERE palavra_id = $1', [id]);
    
    // Registrar log
    await registrarLog('EXCLUIU', word.rows[0]?.ingles, word.rows[0]?.portugues, req);
    
    res.json({ message: 'Removido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir' });
  }
});

// Rota para visualizar logs (protegida)
app.get('/api/logs', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Sem permissão' });
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM logs ORDER BY created_at DESC LIMIT 200'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});