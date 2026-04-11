const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // POST - criar palavra
    if (req.method === 'POST') {
      const { portugues, ingles, pronunciacao } = req.body;
      const palavra_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      
      await pool.query(
        'INSERT INTO palavras (palavra_id, portugues, ingles, pronunciacao) VALUES ($1, $2, $3, $4)',
        [palavra_id, portugues, ingles, pronunciacao]
      );
      
      return res.status(201).json({ id: palavra_id, portugues, ingles, pronunciacao });
    }

    // PUT - editar
    if (req.method === 'PUT') {
      const { portugues, ingles, pronunciacao } = req.body;
      const id = req.url.split('/')[2];
      
      await pool.query(
        'UPDATE palavras SET portugues = $1, ingles = $2, pronunciacao = $3 WHERE palavra_id = $4',
        [portugues, ingles, pronunciacao, id]
      );
      
      return res.status(200).json({ message: 'Atualizado' });
    }

    // DELETE - excluir
    if (req.method === 'DELETE') {
      const id = req.url.split('/')[2];
      await pool.query('DELETE FROM palavras WHERE palavra_id = $1', [id]);
      return res.status(200).json({ message: 'Removido' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
    
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
};