# 🎙️ English Pronunciation Trainer

Aplicação web para treinar pronúncia em inglês. Permite adicionar palavras, ouvir a pronúncia correta e organizar seu vocabulário personalizado.

**🔗 Link do Projeto:** [https://dicionario-ingles-liart.vercel.app/](https://dicionario-ingles-liart.vercel.app/)

---

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Autor](#autor)

---

## 🎯 Sobre o Projeto

Este projeto nasceu da necessidade de praticar pronúncia em inglês de forma personalizada. Diferente de apps prontos, aqui você **controla seu próprio vocabulário**, adicionando palavras que realmente precisa aprender.

Os dados são salvos na nuvem (NeonDB), então você pode acessar de qualquer dispositivo.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| 🔊 **Ouvir pronúncia** | Clique no botão azul para escutar a palavra em inglês (voz natural) |
| ➕ **Adicionar palavra** | Insira português, inglês e pronúncia fonética |
| ✏️ **Renomear** | Edite qualquer palavra existente |
| 🗑️ **Excluir** | Remova palavras com confirmação |
| 📥 **Exportar backup** | Baixe todas as palavras em arquivo JSON |
| 📚 **Agrupamento A-Z** | Palavras organizadas automaticamente pela letra inicial |
| 💾 **Persistente** | Dados salvos no NeonDB (PostgreSQL na nuvem) |

---

## 🛠️ Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | HTML5, CSS3, JavaScript Vanilla | - |
| **Backend** | Node.js + Express | 18.x |
| **Banco de Dados** | PostgreSQL (NeonDB) | 16 |
| **Deploy** | Vercel (Serverless Functions) | - |
| **Controle de Versão** | Git + GitHub | - |

---

## 🏗️ Arquitetura
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Browser │────▶│ Vercel │────▶│ NeonDB │
│ (Frontend) │ │ (Backend) │ │ (PostgreSQL)│
└─────────────┘ └─────────────┘ └─────────────┘
│ │ │
│ GET /api/palavras │ SQL Query │
│◀───────────────────│◀───────────────────│
│ │ │

text

- **Frontend:** Faz requisições fetch para a API
- **Backend:** Vercel Serverless Functions rodam Node.js
- **Banco:** NeonDB hospeda PostgreSQL com SSL

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Node.js (v18+)
- Conta no [NeonDB](https://neon.tech/)

### Passo a Passo

```bash
# 1. Clone o repositório
git clone https://github.com/jay0382/dicionario_ingles.git
cd dicionario_ingles

# 2. Instale as dependências
npm install

# 3. Crie um arquivo .env com sua string do NeonDB
echo DATABASE_URL=postgresql://seu_usuario:senha@host/neondb > .env

# 4. Rode o servidor local
node server.js

# 5. Acesse no navegador
http://localhost:3000
Scripts Disponíveis
Comando	Descrição
npm install	Instala dependências
node server.js	Roda servidor local
☁️ Deploy na Vercel
Passo 1: Subir código para o GitHub
bash
git init
git add .
git commit -m "primeiro commit"
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git push -u origin main
Passo 2: Conectar na Vercel
Acesse vercel.com

Faça login com GitHub

Clique em Add New → Project

Importe o repositório

Configure:

Framework Preset: Other

Build Command: (deixar vazio)

Output Directory: public

Passo 3: Adicionar Variável de Ambiente
Em Settings → Environment Variables, adicione:

Name	Value
DATABASE_URL	postgresql://seu_usuario:senha@host/neondb
Passo 4: Deploy
Clique em Deploy e aguarde 2 minutos.

🗄️ Estrutura do Banco de Dados
Tabela palavras
Coluna	Tipo	Descrição
id	SERIAL	Chave primária auto-incremento
palavra_id	VARCHAR(100)	ID único da palavra (ex: 1700000000-abc123)
portugues	TEXT	Tradução em português
ingles	VARCHAR(255)	Palavra em inglês
pronunciacao	TEXT	Pronúncia fonética
created_at	TIMESTAMP	Data de criação
SQL de Criação
sql
CREATE TABLE palavras (
    id SERIAL PRIMARY KEY,
    palavra_id VARCHAR(100) UNIQUE NOT NULL,
    portugues TEXT NOT NULL,
    ingles VARCHAR(255) NOT NULL,
    pronunciacao TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
🔌 Endpoints da API
Método	Endpoint	Descrição
GET	/api/palavras	Retorna todas as palavras
GET	/api/palavras/:id	Retorna uma palavra específica
POST	/api/palavras	Adiciona nova palavra
PUT	/api/palavras/:id	Edita palavra existente
DELETE	/api/palavras/:id	Remove palavra
Exemplo de Requisição POST
json
{
  "portugues": "aceitar",
  "ingles": "accept",
  "pronunciacao": "âk-SÉPT"
}
📁 Estrutura de Arquivos
text
dicionario_ingles/
├── api/
│   └── palavras.js          # Endpoints da API (Serverless)
├── public/
│   ├── css/
│   │   └── style.css        # Estilos
│   ├── js/
│   │   └── app.js           # Lógica frontend
│   └── index.html           # Página principal
├── server.js                # Servidor local (teste)
├── package.json             # Dependências Node
├── vercel.json              # Configuração Vercel
├── .env                     # Variáveis (não commitar)
└── .gitignore               # Arquivos ignorados
🔐 Variáveis de Ambiente
Crie um arquivo .env na raiz:

env
DATABASE_URL=postgresql://usuario:senha@host:port/banco?sslmode=require
⚠️ Nunca commite o .env! Ele está no .gitignore.

👨‍💻 Autor
Jay0382

GitHub: @jay0382

Projeto: dicionario_ingles

📄 Licença
MIT - Sinta-se livre para usar, modificar e distribuir.

⭐ Agradecimento
Projeto desenvolvido como desafio pessoal de aprendizado.
Toda sugestão é bem-vinda!

text

---

## 🔧 Commit e push:

```bash
git add README.md
git commit -m "docs: adiciona README profissional"
git push