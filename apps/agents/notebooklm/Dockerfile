# Imagen opcional para ejecutar solo el cliente Python (auth por volumen / env).
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
  && playwright install chromium --with-deps
COPY src/ ./src/
ENV PYTHONUNBUFFERED=1
# Entrada por stdin JSON (mismo contrato que client.py)
CMD ["python3", "-u", "src/client.py"]
