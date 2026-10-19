FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY agent.py /app/agent.py
RUN pip install --no-cache-dir httpx==0.28.1
USER 10001:10001
CMD ["python", "/app/agent.py"]
