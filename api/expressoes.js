// api/expressoes.js
const { Pool } = require('pg');

// Conectar ao NeonDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS (pré-voo CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, query, body } = req;

    // GET - Buscar todas as expressões
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM expressoes ORDER BY created_at DESC');
      return res.status(200).json(result.rows);
    }

    // POST - Adicionar expressão
    if (method === 'POST') {
      const { ingles, portugues, pronunciacao } = body;
      
      if (!ingles || !portugues) {
        return res.status(400).json({ error: 'Inglês e português são obrigatórios' });
      }
      
      const expressao_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
      await pool.query(
        'INSERT INTO expressoes (expressao_id, ingles, portugues, pronunciacao) VALUES ($1, $2, $3, $4)',
        [expressao_id, ingles, portugues, pronunciacao || '']
      );
      
      return res.status(201).json({ 
        id: expressao_id, 
        ingles, 
        portugues, 
        pronunciacao 
      });
    }

    // PUT - Editar expressão
    if (method === 'PUT') {
      const { id } = query;
      const { ingles, portugues, pronunciacao } = body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }
      
      await pool.query(
        'UPDATE expressoes SET ingles = $1, portugues = $2, pronunciacao = $3 WHERE expressao_id = $4',
        [ingles, portugues, pronunciacao || '', id]
      );
      
      return res.status(200).json({ message: 'Expressão atualizada' });
    }

    // DELETE - Excluir expressão
    if (method === 'DELETE') {
      const { id } = query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }
      
      await pool.query('DELETE FROM expressoes WHERE expressao_id = $1', [id]);
      
      return res.status(200).json({ message: 'Expressão removida' });
    }

    // Método não permitido
    return res.status(405).json({ error: 'Método não permitido' });
    
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};