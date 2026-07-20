const API_URL = '/api/expressoes';
let currentEditId = null;

// Carregar expressões do banco
async function loadExpressions() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao carregar');
    const expressions = await response.json();
    renderExpressions(expressions);
  } catch (error) {
    console.error('Erro:', error);
    document.getElementById('expressionsLibrary').innerHTML = 
      '<div class="empty-message">❌ Erro ao conectar com o banco de dados. Verifique sua conexão.</div>';
  }
}

// Renderizar expressões
function renderExpressions(expressionsArray) {
  const libraryDiv = document.getElementById('expressionsLibrary');
  
  if (!expressionsArray || expressionsArray.length === 0) {
    libraryDiv.innerHTML = '<div class="empty-message">📭 Nenhuma expressão cadastrada. Adicione usando o formulário!</div>';
    return;
  }
  
  let html = '';
  
  for (let expr of expressionsArray) {
    html += `
      <div class="expression-card" data-id="${expr.id}">
        <div class="expression-info">
          <h3>${escapeHtml(expr.ingles)}</h3>
          <div class="pronunciation">🔊 ${escapeHtml(expr.pronunciacao || 'Sem pronúncia')}</div>
          <div class="translation">🇧🇷 ${escapeHtml(expr.portugues)}</div>
        </div>
        <div class="expression-actions">
          <button class="btn-sm btn-listen" onclick="speakExpression('${escapeHtml(expr.ingles)}')">🔊 Ouvir</button>
          <button class="btn-sm btn-edit" onclick="openEditModal('${expr.id}')">✏️ Editar</button>
          <button class="btn-sm btn-delete" onclick="deleteExpression('${expr.id}')">🗑️ Excluir</button>
        </div>
      </div>
    `;
  }
  
  libraryDiv.innerHTML = html;
}

// Falar expressão
function speakExpression(phrase) {
  if (!phrase) return;
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = 'en-US';
  utterance.rate = 0.7;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// Adicionar expressão
async function addExpression() {
  const portugues = document.getElementById('newPortuguese').value.trim();
  const ingles = document.getElementById('newEnglish').value.trim();
  const pronunciacao = document.getElementById('newPronunciation').value.trim();
  
  if (!portugues || !ingles) {
    alert('❌ Preencha pelo menos o inglês e o português!');
    return;
  }
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portugues, ingles, pronunciacao })
    });
    
    if (!response.ok) throw new Error('Erro ao salvar');
    
    document.getElementById('newPortuguese').value = '';
    document.getElementById('newEnglish').value = '';
    document.getElementById('newPronunciation').value = '';
    
    loadExpressions();
    showToast('✅ Expressão adicionada com sucesso!');
  } catch (error) {
    alert('❌ Erro ao adicionar expressão');
  }
}

// Abrir modal de edição
async function openEditModal(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const expr = await response.json();
    
    currentEditId = id;
    
    document.getElementById('editPortuguese').value = expr.portugues;
    document.getElementById('editEnglish').value = expr.ingles;
    document.getElementById('editPronunciation').value = expr.pronunciacao || '';
    document.getElementById('editModal').style.display = 'flex';
  } catch (error) {
    alert('❌ Erro ao carregar expressão para edição');
  }
}

// Salvar edição
async function saveEdit() {
  const portugues = document.getElementById('editPortuguese').value.trim();
  const ingles = document.getElementById('editEnglish').value.trim();
  const pronunciacao = document.getElementById('editPronunciation').value.trim();
  
  if (!portugues || !ingles) {
    alert('❌ Preencha pelo menos o inglês e o português!');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portugues, ingles, pronunciacao })
    });
    
    if (!response.ok) throw new Error('Erro ao editar');
    
    closeModal();
    loadExpressions();
    showToast('✅ Expressão atualizada com sucesso!');
  } catch (error) {
    alert('❌ Erro ao editar expressão');
  }
}

// Excluir expressão
async function deleteExpression(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const expr = await response.json();
    
    const confirmMsg = `Tem certeza que deseja excluir?\n\n🇺🇸 ${expr.ingles}\n🇧🇷 ${expr.portugues}\n🔊 ${expr.pronunciacao || 'Sem pronúncia'}`;
    
    if (confirm(confirmMsg)) {
      const deleteResponse = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (deleteResponse.ok) {
        loadExpressions();
        showToast('🗑️ Expressão excluída com sucesso!');
      } else {
        alert('❌ Erro ao excluir');
      }
    }
  } catch (error) {
    alert('❌ Erro ao excluir expressão');
  }
}

// Funções auxiliares
function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditId = null;
}

function showToast(message) {
  // Reutiliza o mesmo estilo do app.js
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  loadExpressions();
  document.getElementById('addExpressionBtn').addEventListener('click', addExpression);
  document.getElementById('exportExpressionsBtn').addEventListener('click', exportBackup);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
  
  // Enter para adicionar
  ['newPortuguese', 'newEnglish', 'newPronunciation'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addExpression();
    });
  });
});

// Exportar backup (adaptado)
async function exportBackup() {
  try {
    const response = await fetch(API_URL);
    const expressions = await response.json();
    const dataStr = JSON.stringify(expressions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expressoes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 Backup exportado com sucesso!');
  } catch (error) {
    alert('❌ Erro ao exportar backup');
  }
}

// Adicionar modal de edição (dinamicamente)
const modalHTML = `
<div id="editModal" class="modal">
  <div class="modal-content">
    <h3>✏️ Editar expressão</h3>
    <input type="text" id="editPortuguese" placeholder="🇧🇷 Português">
    <input type="text" id="editEnglish" placeholder="🇺🇸 Inglês">
    <input type="text" id="editPronunciation" placeholder="🔊 Pronúncia (fonética)">
    <div class="modal-buttons">
      <button id="saveEditBtn" style="background:#8b5cf6; color:white;">💾 Salvar</button>
      <button id="closeModal" style="background:#475569; color:white;">❌ Cancelar</button>
    </div>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);