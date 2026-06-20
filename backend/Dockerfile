FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements_training.txt .
RUN pip install --no-cache-dir -r requirements_training.txt

COPY backend/ .

ENV PYTHONUNBUFFERED=1
ENV OPENAI_API_KEY=""
ENV GOOGLE_API_KEY=""

EXPOSE 8000

CMD ["python", "start.py"]
