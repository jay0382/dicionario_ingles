const API_URL = '/api/palavras';

let currentEditId = null;

// Carregar palavras do banco
async function loadWords() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Erro ao carregar');
    const words = await response.json();
    renderWords(words);
  } catch (error) {
    console.error('Erro:', error);
    document.getElementById('wordsLibrary').innerHTML = 
      '<div class="empty-message">❌ Erro ao conectar com o banco de dados. Verifique sua conexão.</div>';
  }
}

// Renderizar palavras agrupadas
function renderWords(wordsArray) {
  const libraryDiv = document.getElementById('wordsLibrary');
  
  if (!wordsArray || wordsArray.length === 0) {
    libraryDiv.innerHTML = '<div class="empty-message">📭 Nenhuma palavra cadastrada. Adicione usando o formulário!</div>';
    return;
  }
  
  // Agrupar por letra inicial
  const groups = new Map();
  wordsArray.forEach(word => {
    if (!word.ingles) return;
    const firstLetter = word.ingles.charAt(0).toUpperCase();
    if (!groups.has(firstLetter)) groups.set(firstLetter, []);
    groups.get(firstLetter).push(word);
  });
  
  const sortedLetters = Array.from(groups.keys()).sort();
  let html = '';
  
  for (let letter of sortedLetters) {
    const wordList = groups.get(letter);
    wordList.sort((a,b) => a.ingles.localeCompare(b.ingles));
    const containerId = `wordsContainer_${letter}`;
    
    html += `<div class="letter-section">`;
    html += `<div class="letter-header" onclick="toggleWordsContainer('${containerId}')">`;
    html += `<span>📘 ${letter}</span> <span>${wordList.length} palavra${wordList.length !== 1 ? 's' : ''}</span>`;
    html += `</div>`;
    html += `<div class="words-container" id="${containerId}" style="display: none;">`;
    
    for (let word of wordList) {
      html += `
        <div class="card" data-id="${word.id}">
          <div class="portuguese">🇧🇷 ${escapeHtml(word.portugues)}</div>
          <div class="english">${escapeHtml(word.ingles)}</div>
          <div class="pronunciation">🔊 ${escapeHtml(word.pronunciacao)}</div>
          <div class="card-actions">
            <button class="btn-speak" data-word="${escapeAttr(word.ingles)}">🔊 Ouvir</button>
            <button class="btn-edit" data-id="${word.id}">✏️ Renomear</button>
            <button class="btn-delete" data-id="${word.id}">🗑️ Excluir</button>
          </div>
        </div>
      `;
    }
    html += `</div></div>`;
  }
  
  libraryDiv.innerHTML = html;
  
  // Adicionar eventos
  document.querySelectorAll('.btn-speak').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(btn.getAttribute('data-word'));
    });
  });
  
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(btn.getAttribute('data-id'));
    });
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteWord(btn.getAttribute('data-id'));
    });
  });
}

// Falar palavra
function speakWord(word) {
  if (!word) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.65;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// Alternar container
window.toggleWordsContainer = function(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.style.display = container.style.display === 'block' ? 'none' : 'block';
  }
};

// Adicionar palavra
async function addWord() {
  const portugues = document.getElementById('newPortuguese').value.trim();
  const ingles = document.getElementById('newEnglish').value.trim();
  const pronunciacao = document.getElementById('newPronunciation').value.trim();
  
  if (!portugues || !ingles || !pronunciacao) {
    alert('❌ Preencha todos os campos!');
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
    
    loadWords();
  } catch (error) {
    alert('Erro ao adicionar palavra');
  }
}

// Abrir modal de edição
async function openEditModal(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const word = await response.json();
    
    currentEditId = id;
    
    const modal = document.getElementById('editModal');
    document.getElementById('editPortuguese').value = word.portugues;
    document.getElementById('editEnglish').value = word.ingles;
    document.getElementById('editPronunciation').value = word.pronunciacao;
    modal.style.display = 'flex';
  } catch (error) {
    alert('Erro ao carregar palavra para edição');
  }
}

// Salvar edição
async function saveEdit() {
  const portugues = document.getElementById('editPortuguese').value.trim();
  const ingles = document.getElementById('editEnglish').value.trim();
  const pronunciacao = document.getElementById('editPronunciation').value.trim();
  
  if (!portugues || !ingles || !pronunciacao) {
    alert('❌ Preencha todos os campos!');
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
    loadWords();
  } catch (error) {
    alert('Erro ao editar palavra');
  }
}

// Excluir palavra com confirmação
async function deleteWord(id) {
  // Buscar palavra para mostrar no confirm
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const word = await response.json();
    
    const confirmMsg = `Tem certeza que deseja excluir?\n\n🇧🇷 ${word.portugues}\n🇺🇸 ${word.ingles}\n🔊 ${word.pronunciacao}`;
    
    if (confirm(confirmMsg)) {
      const deleteResponse = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (deleteResponse.ok) {
        loadWords();
      } else {
        alert('Erro ao excluir');
      }
    }
  } catch (error) {
    alert('Erro ao excluir palavra');
  }
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditId = null;
}

// Exportar backup
async function exportBackup() {
  try {
    const response = await fetch(API_URL);
    const words = await response.json();
    const dataStr = JSON.stringify(words, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronuncia-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Erro ao exportar backup');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Eventos
document.addEventListener('DOMContentLoaded', () => {
  loadWords();
  document.getElementById('addWordBtn').addEventListener('click', addWord);
  document.getElementById('exportBtn').addEventListener('click', exportBackup);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
});

// Modal HTML (adicionar dinamicamente)
const modalHTML = `
<div id="editModal" class="modal">
  <div class="modal-content">
    <h3>✏️ Renomear palavra</h3>
    <input type="text" id="editPortuguese" placeholder="Português">
    <input type="text" id="editEnglish" placeholder="Inglês">
    <input type="text" id="editPronunciation" placeholder="Pronúncia">
    <div class="modal-buttons">
      <button id="saveEditBtn" style="background:#22c55e; color:white;">Salvar</button>
      <button id="closeModal" style="background:#475569; color:white;">Cancelar</button>
    </div>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);