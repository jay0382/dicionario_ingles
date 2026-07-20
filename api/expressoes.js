// api/expressoes.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Listar
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM expressoes ORDER BY created_at DESC');
      return res.status(200).json(result.rows);
    }

    // POST - Adicionar
    if (req.method === 'POST') {
      const { ingles, portugues, pronunciacao } = req.body;
      const expressao_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      
      await pool.query(
        'INSERT INTO expressoes (expressao_id, ingles, portugues, pronunciacao) VALUES ($1, $2, $3, $4)',
        [expressao_id, ingles, portugues, pronunciacao || '']
      );
      
      return res.status(201).json({ id: expressao_id, ingles, portugues, pronunciacao });
    }

    // PUT - Editar
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { ingles, portugues, pronunciacao } = req.body;
      
      await pool.query(
        'UPDATE expressoes SET ingles = $1, portugues = $2, pronunciacao = $3 WHERE expressao_id = $4',
        [ingles, portugues, pronunciacao, id]
      );
      
      return res.status(200).json({ message: 'Atualizado' });
    }

    // DELETE - Excluir
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await pool.query('DELETE FROM expressoes WHERE expressao_id = $1', [id]);
      return res.status(200).json({ message: 'Removido' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno: ' + error.message });
  }
};