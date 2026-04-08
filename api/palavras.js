const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlParts = req.url.split('/');
  const id = urlParts[2];

  try {
    // GET todas
    if (req.method === 'GET' && !id) {
      const result = await pool.query(
        'SELECT palavra_id as id, portugues, ingles, pronunciacao FROM palavras ORDER BY ingles'
      );
      return res.status(200).json(result.rows);
    }

    // GET uma
    if (req.method === 'GET' && id) {
      const result = await pool.query(
        'SELECT palavra_id as id, portugues, ingles, pronunciacao FROM palavras WHERE palavra_id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Palavra não encontrada' });
      }
      return res.status(200).json(result.rows[0]);
    }

    // POST (criar)
    if (req.method === 'POST') {
      const { portugues, ingles, pronunciacao } = req.body;
      if (!portugues || !ingles || !pronunciacao) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }
      
      const palavra_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      const result = await pool.query(
        'INSERT INTO palavras (palavra_id, portugues, ingles, pronunciacao) VALUES ($1, $2, $3, $4) RETURNING *',
        [palavra_id, portugues, ingles, pronunciacao]
      );
      
      return res.status(201).json({
        id: result.rows[0].palavra_id,
        portugues: result.rows[0].portugues,
        ingles: result.rows[0].ingles,
        pronunciacao: result.rows[0].pronunciacao
      });
    }

    // PUT (renomear/editar)
    if (req.method === 'PUT') {
      const { portugues, ingles, pronunciacao } = req.body;
      if (!portugues || !ingles || !pronunciacao) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }
      
      const result = await pool.query(
        'UPDATE palavras SET portugues = $1, ingles = $2, pronunciacao = $3 WHERE palavra_id = $4 RETURNING *',
        [portugues, ingles, pronunciacao, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Palavra não encontrada' });
      }
      
      return res.status(200).json({
        id: result.rows[0].palavra_id,
        portugues: result.rows[0].portugues,
        ingles: result.rows[0].ingles,
        pronunciacao: result.rows[0].pronunciacao
      });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const result = await pool.query('DELETE FROM palavras WHERE palavra_id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Palavra não encontrada' });
      }
      return res.status(200).json({ message: 'Palavra removida com sucesso' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};