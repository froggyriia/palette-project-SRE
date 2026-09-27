FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# Port comes from the environment at run time (12-factor: Port binding),
# defaulting to 8000 for local dev.
#
# Concurrency comes from the number of uvicorn worker processes, set via
# WEB_CONCURRENCY (12-factor: Concurrency — scale out by adding processes,
# not by making a single process fancier). Defaults to 1 so local/dev
# behaves exactly as before; a real deploy sets WEB_CONCURRENCY=N via env.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-1}"]
