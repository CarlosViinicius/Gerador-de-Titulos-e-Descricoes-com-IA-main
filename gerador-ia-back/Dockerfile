# Dockerfile - BACKEND
FROM python:3.11-slim

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (opcional, caso precise compilar algo)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala as dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . .

# Define variável de ambiente para saída não-buffered (útil para logs)
ENV PYTHONUNBUFFERED=1

# Expõe a porta que o Uvicorn irá rodar
EXPOSE 8000

# Comando default para iniciar o servidor FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]