from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os
from pathlib import Path

# Carrega variáveis do arquivo .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# Configura o CORS para permitir o frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de dados esperado do frontend
class Produto(BaseModel):
    categoria: str
    beneficios: str
    material: str

# IA: prioridade = Groq (grátis nuvem) > OpenAI (pago) > Ollama (grátis local)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
API_KEY = os.getenv("API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

if GROQ_API_KEY:
    # Groq (grátis na nuvem) – chave em https://console.groq.com
    client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
    AI_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    AI_PROVIDER = "Groq"
elif API_KEY:
    # OpenAI (pago)
    client = OpenAI(api_key=API_KEY)
    AI_MODEL = "gpt-3.5-turbo"
    AI_PROVIDER = "OpenAI"
else:
    # Ollama (grátis, local) – instale em https://ollama.com e rode: ollama pull llama3.2
    client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
    AI_MODEL = OLLAMA_MODEL
    AI_PROVIDER = "Ollama"
print(f"[IA] Provedor: {AI_PROVIDER} | Modelo: {AI_MODEL}")

# ----------------- SQLAlchemy / SQLite -----------------
from sqlalchemy import Column, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Configuração do SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./db.sqlite3"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelo da tabela para histórico de títulos/descrições
class TitleModel(Base):
    __tablename__ = "titles"
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descricao = Column(Text, nullable=False)

# Cria o arquivo db.sqlite3 e a tabela, se não existirem
Base.metadata.create_all(bind=engine)

# Dependency para obter sessão do DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Schemas Pydantic para validação/serialização do histórico
class TitleCreate(BaseModel):
    titulo: str
    descricao: str

class Title(BaseModel):
    id: int
    titulo: str
    descricao: str

    class Config:
        orm_mode = True

# Endpoints de CRUD para histórico
@app.get("/titles", response_model=list[Title])
def read_titles(db: Session = Depends(get_db)):
    return db.query(TitleModel).order_by(TitleModel.id.desc()).all()

@app.post("/titles", response_model=Title)
def create_title(item: TitleCreate, db: Session = Depends(get_db)):
    db_obj = TitleModel(titulo=item.titulo, descricao=item.descricao)
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

# -------------------------------------------------------

# Rota para gerar título e descrição
@app.post("/gerar")
def gerar_titulo_descricao(produto: Produto):
    try:
        print("\n========= NOVA REQUISIÇÃO =========")
        print(f"Categoria recebida: {produto.categoria}")
        print(f"Benefícios recebidos: {produto.beneficios}")
        print(f"Material recebido: {produto.material}")

        prompt = (
            f"Crie um título e uma descrição CURTOS para um produto com base nas informações:\n"
            f"Categoria: {produto.categoria}\n"
            f"Benefícios: {produto.beneficios}\n"
            f"Material: {produto.material}\n\n"
            "Regras: retorne APENAS texto puro, sem Markdown (sem **, sem #). "
            "Título: no máximo 60 caracteres, uma linha só, direto ao ponto.\n"
            "Descrição: no máximo 2 ou 3 frases (cerca de 150 a 200 caracteres), objetiva.\n"
            "Formato exato:\n"
            "Título: (título curto)\n"
            "Descrição: (descrição curta)"
        )

        print("\nPrompt montado para enviar à IA:")
        print(prompt)

        response = client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": "Você é um especialista em marketing de produtos."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=350
        )

        resultado = response.choices[0].message.content if response.choices else None
        if not resultado or not resultado.strip():
            resultado = "A IA não retornou texto. Tente novamente."

        print("\n========= RESPOSTA RECEBIDA =========")
        print(resultado)

        return {"resultado": resultado}

    except Exception as e:
        print("\n========= ERRO NO BACKEND =========")
        import traceback
        traceback.print_exc()
        err_msg = str(e).strip() or type(e).__name__
        return {"resultado": f"Erro ao gerar conteúdo: {err_msg}"}