from fastapi import FastAPI, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os
from pathlib import Path
from sqlalchemy import Column, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 1. Configurações Iniciais e Variáveis de Ambiente
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Configuração de IA (Groq / OpenAI / Ollama)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
API_KEY = os.getenv("API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

if GROQ_API_KEY:
    client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    AI_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    AI_PROVIDER = "Groq"
elif API_KEY:
    client = OpenAI(api_key=API_KEY)
    AI_MODEL = "gpt-3.5-turbo"
    AI_PROVIDER = "OpenAI"
else:
    client = OpenAI(api_url=OLLAMA_BASE_URL, api_key="ollama")
    AI_MODEL = OLLAMA_MODEL
    AI_PROVIDER = "Ollama"

print(f"[IA] Provedor: {AI_PROVIDER} | Modelo Padrão: {AI_MODEL}")

# ----------------- 3. SQLAlchemy / SQLite -----------------
# O banco fica no /tmp para funcionar na Vercel
SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/db.sqlite3"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo da tabela com o novo campo user_id
class TitleModel(Base):
    __tablename__ = "titles"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descricao = Column(Text, nullable=False)
    user_id = Column(String, index=True, nullable=False) # Identificador do navegador

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------- 4. Schemas Pydantic -----------------
class Produto(BaseModel):
    # Todos agora são opcionais, pois o usuário pode mandar só a foto
    categoria: Optional[str] = ""
    beneficios: Optional[str] = ""
    material: Optional[str] = ""
    imagem: Optional[str] = None # Campo para receber a imagem em base64

class TitleCreate(BaseModel):
    titulo: str
    descricao: str
    user_id: str # Campo obrigatório ao salvar

class TitleResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    user_id: str

    class Config:
        from_attributes = True # Compatível com SQLAlchemy

# ----------------- 5. Endpoints de CRUD -----------------

@app.get("/titles", response_model=list[TitleResponse])
def read_titles(user_id: str = Query(...), db: Session = Depends(get_db)):
    """Busca títulos filtrando pelo ID único do usuário/navegador"""
    return db.query(TitleModel).filter(TitleModel.user_id == user_id).order_by(TitleModel.id.desc()).all()

@app.post("/titles", response_model=TitleResponse)
def create_title(item: TitleCreate, db: Session = Depends(get_db)):
    """Salva um título vinculado a um user_id"""
    db_obj = TitleModel(
        titulo=item.titulo, 
        descricao=item.descricao, 
        user_id=item.user_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.delete("/titles/{title_id}", status_code=204)
def delete_title(title_id: int, db: Session = Depends(get_db)):
    db_obj = db.query(TitleModel).filter(TitleModel.id == title_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Título não encontrado")
    db.delete(db_obj)
    db.commit()

# ----------------- 6. Rota de Geração de IA -----------------

@app.post("/gerar")
def gerar_titulo_descricao(produto: Produto):
    try:
        # Define o modelo atual que vai ser usado na requisição
        current_model = AI_MODEL

        prompt_text = (
            f"Crie um título e uma descrição CURTOS e ALTAMENTE VENDEDORES para um produto.\n"
            "Se houver uma imagem fornecida, analise a imagem e descreva o produto que você vê nela, combinando com as informações abaixo (se existirem):\n"
            f"- Categoria: {produto.categoria or 'Não informada'}\n"
            f"- Benefícios/Detalhes extras: {produto.beneficios or 'Não informados'}\n"
            f"- Material: {produto.material or 'Não informado'}\n\n"
            "Regras: retorne APENAS texto puro, sem Markdown. "
            "Título: atrativo, máximo 60 caracteres.\n"
            "Descrição: máximo 3 frases objetivas focadas em conversão.\n"
            "Formato exato de resposta:\nTítulo: (texto)\nDescrição: (texto)"
        )

        # Se o usuário enviou imagem, mudamos a estrutura da mensagem
        if produto.imagem:
            user_content = [
                {"type": "text", "text": prompt_text},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": produto.imagem # Já vem como data:image/jpeg;base64,... do React
                    }
                }
            ]
            
            # --- CORREÇÃO DO MODELO DE VISÃO ---
            if AI_PROVIDER == "Groq":
                # Utiliza o modelo de visão mais recente recomendado pela Groq (Llama 4 Scout)
                current_model = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
            elif AI_PROVIDER == "OpenAI":
                current_model = "gpt-4o-mini"
            
            print(f"📸 Imagem recebida! Usando modelo de visão: {current_model}")
            
        else:
            # Se não tem imagem, envia só a string normal
            user_content = prompt_text
            print(f"📝 Apenas texto recebido. Usando modelo: {current_model}")

        # Faz a chamada para a IA
        response = client.chat.completions.create(
            model=current_model,
            messages=[
                {"role": "system", "content": "Você é um Copywriter Especialista em E-commerce e Análise de Imagens."},
                {"role": "user", "content": user_content}
            ],
            temperature=0.7,
            max_tokens=400 # Boa prática para visão
        )

        resultado = response.choices[0].message.content if response.choices else "Erro na IA"
        return {"resultado": resultado}

    except Exception as e:
        print(f"Erro no backend: {str(e)}") # Útil para debug no terminal
        return {"resultado": f"Erro ao gerar conteúdo: {str(e)}"}