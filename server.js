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

// ========== ROTAS PARA EXPRESSÕES ==========

// Buscar todas as expressões
app.get('/api/expressoes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT expressao_id as id, ingles, portugues, pronunciacao, created_at FROM expressoes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar expressões:', err);
    res.status(500).json({ error: 'Erro ao buscar expressões' });
  }
});

// Adicionar expressão (COM LOG)
app.post('/api/expressoes', async (req, res) => {
  try {
    const { portugues, ingles, pronunciacao } = req.body;
    
    if (!portugues || !ingles) {
      return res.status(400).json({ error: 'Português e inglês são obrigatórios' });
    }
    
    const expressao_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
    await pool.query(
      'INSERT INTO expressoes (expressao_id, portugues, ingles, pronunciacao) VALUES ($1, $2, $3, $4)',
      [expressao_id, portugues, ingles, pronunciacao || '']
    );
    
    // Registrar log (usando a mesma função)
    await registrarLog('ADICIONOU_EXPRESSAO', ingles, portugues, req);
    
    res.status(201).json({ id: expressao_id, portugues, ingles, pronunciacao });
  } catch (err) {
    console.error('Erro ao adicionar expressão:', err);
    res.status(500).json({ error: 'Erro ao adicionar expressão' });
  }
});

// Editar expressão (COM LOG)
app.put('/api/expressoes/:id', async (req, res) => {
  try {
    const { portugues, ingles, pronunciacao } = req.body;
    const { id } = req.params;
    
    // Buscar expressão antiga para o log
    const oldExpr = await pool.query('SELECT ingles, portugues FROM expressoes WHERE expressao_id = $1', [id]);
    
    if (oldExpr.rows.length === 0) {
      return res.status(404).json({ error: 'Expressão não encontrada' });
    }
    
    await pool.query(
      'UPDATE expressoes SET portugues = $1, ingles = $2, pronunciacao = $3 WHERE expressao_id = $4',
      [portugues, ingles, pronunciacao || '', id]
    );
    
    // Registrar log
    const logIngles = `${oldExpr.rows[0]?.ingles || '?'} → ${ingles}`;
    const logPortugues = `${oldExpr.rows[0]?.portugues || '?'} → ${portugues}`;
    await registrarLog('EDITOU_EXPRESSAO', logIngles, logPortugues, req);
    
    res.json({ message: 'Expressão atualizada' });
  } catch (err) {
    console.error('Erro ao editar expressão:', err);
    res.status(500).json({ error: 'Erro ao editar expressão' });
  }
});

// Excluir expressão (COM LOG)
app.delete('/api/expressoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar expressão para o log
    const expr = await pool.query('SELECT ingles, portugues FROM expressoes WHERE expressao_id = $1', [id]);
    
    if (expr.rows.length === 0) {
      return res.status(404).json({ error: 'Expressão não encontrada' });
    }
    
    await pool.query('DELETE FROM expressoes WHERE expressao_id = $1', [id]);
    
    // Registrar log
    await registrarLog('EXCLUIU_EXPRESSAO', expr.rows[0]?.ingles, expr.rows[0]?.portugues, req);
    
    res.json({ message: 'Expressão removida' });
  } catch (err) {
    console.error('Erro ao excluir expressão:', err);
    res.status(500).json({ error: 'Erro ao excluir expressão' });
  }
});

// Rota para migrar expressões iniciais (protegida)
app.post('/api/expressoes/migrate', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Sem permissão' });
  }
  
  try {
    // Lista de expressões iniciais
    const expressions = [
      { ingles: 'Do it again', portugues: 'Faça de novo', pronunciacao: '/DU ÍT a-GÉN/' },
      { ingles: 'Let me speak', portugues: 'Me deixa falar', pronunciacao: '/LÉT MÍ SPÍK/' },
      { ingles: 'This is for you', portugues: 'Isso é pra você', pronunciacao: '/DÍS ÍZ FÓR IÚ/' },
      { ingles: 'How do you know?', portugues: 'Como você sabe?', pronunciacao: '/HÁU DU IÚ NÔU/' },
      { ingles: 'Calm down', portugues: 'Acalme-se', pronunciacao: '/KÁLM DÁUN/' },
      { ingles: 'I\'ll go there', portugues: 'Eu irei lá', pronunciacao: '/ÁIL GÔU DÉR/' },
      { ingles: 'At any cost', portugues: 'A qualquer custo', pronunciacao: '/ÉT ÉNI KÓST/' },
      { ingles: 'I\'m hungry', portugues: 'Estou com fome', pronunciacao: '/ÁIM HÁNG-RI/' },
      { ingles: 'Come here', portugues: 'Vem aqui', pronunciacao: '/KÁM HÍR/' },
      { ingles: 'Good luck', portugues: 'Boa sorte', pronunciacao: '/GÚD LÁK/' },
      { ingles: 'See you', portugues: 'Até logo', pronunciacao: '/SÍ IÚ/' },
      { ingles: 'Can you go?', portugues: 'Você pode vir?', pronunciacao: '/KÉN IÚ GÔU/' },
      { ingles: 'Don\'t run', portugues: 'Não corra', pronunciacao: '/DÔUNT RÁN/' },
      { ingles: 'Catch you later', portugues: 'Te vejo depois', pronunciacao: '/KÁTCH IÚ LÉI-TER/' },
      { ingles: 'Like this', portugues: 'Desse jeito', pronunciacao: '/LÁIK DÍS/' },
      { ingles: 'Be careful', portugues: 'Tome cuidado', pronunciacao: '/BÍ KÉR-ful/' },
      { ingles: 'Help me please', portugues: 'Me ajuda, por favor', pronunciacao: '/HÉLP MÍ PLÍS/' },
      { ingles: 'No problem', portugues: 'Sem problema', pronunciacao: '/NÔU PRÓ-blém/' },
      { ingles: 'No need', portugues: 'Não precisa', pronunciacao: '/NÔU NÍD/' },
      { ingles: 'Alright', portugues: 'Tudo certo', pronunciacao: '/ÓL-RÁIT/' },
      { ingles: 'Take it easy', portugues: 'Vai com calma', pronunciacao: '/TÊIK ÍT Í-zi/' },
      { ingles: 'Of course', portugues: 'É claro', pronunciacao: '/ÓV KÓRS/' },
      { ingles: 'No way', portugues: 'Sem chance', pronunciacao: '/NÔU UÉI/' },
      { ingles: 'Talk to me', portugues: 'Fala pra mim', pronunciacao: '/TÓK TÚ MÍ/' },
      { ingles: 'I think so', portugues: 'Eu acho que sim', pronunciacao: '/ÁI THÍNK SÔU/' },
      { ingles: 'You rock', portugues: 'Você é demais', pronunciacao: '/IÚ RÓK/' },
      { ingles: 'I don\'t get it', portugues: 'Eu não entendi isso', pronunciacao: '/ÁI DÔUNT GÉT ÍT/' },
      { ingles: 'Forget it', portugues: 'Esqueça isso', pronunciacao: '/FÓR-GUÉT ÍT/' },
      { ingles: 'Keep going', portugues: 'Continue indo', pronunciacao: '/KÍP GÔU-IN/' }
    ];
    
    let adicionadas = 0;
    let existentes = 0;
    
    for (const exp of expressions) {
      // Verificar se já existe
      const check = await pool.query(
        'SELECT expressao_id FROM expressoes WHERE ingles = $1 AND portugues = $2',
        [exp.ingles, exp.portugues]
      );
      
      if (check.rows.length === 0) {
        const expressao_id = Date.now() + '-' + Math.random().toString(36).substr(2, 8);
        await pool.query(
          'INSERT INTO expressoes (expressao_id, ingles, portugues, pronunciacao) VALUES ($1, $2, $3, $4)',
          [expressao_id, exp.ingles, exp.portugues, exp.pronunciacao]
        );
        adicionadas++;
      } else {
        existentes++;
      }
    }
    
    res.json({ 
      message: 'Migração concluída', 
      adicionadas, 
      existentes,
      total: expressions.length 
    });
  } catch (err) {
    console.error('Erro na migração:', err);
    res.status(500).json({ error: 'Erro na migração' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});