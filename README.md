# Palette App

Генератор цветовых палитр: фронтенд на React, бэкенд на FastAPI, база PostgreSQL. Развёртывание в Kubernetes (minikube) описано в [`k8s/`](k8s), отчёты по заданиям лежат в папках `k8s/`, `logging/`, `monitoring/`, `slo/`, `alerting/`.

## Миграции базы данных

Схема базы управляется [Alembic](https://alembic.sqlalchemy.org/): каждое изменение таблиц — отдельный файл в [`backend/migrations/versions/`](backend/migrations/versions), текущая версия схемы хранится в таблице `alembic_version`. Команда `alembic upgrade head` доводит базу до последней версии; если база уже актуальна, она ничего не делает.

Адрес базы Alembic берёт из переменной окружения `DATABASE_URL`, как и само приложение ([`backend/migrations/env.py`](backend/migrations/env.py)).

### Kubernetes (minikube)

Миграции применяет Job `migrate` ([`k8s/20-migrate.yaml`](k8s/20-migrate.yaml)) при `kubectl apply -f k8s/`. Он запускается из образа бэкенда и повторяет попытку каждые 3 секунды, пока база не станет доступна.

```sh
kubectl get job migrate          # COMPLETIONS 1/1 — миграции применены
kubectl logs job/migrate         # вывод alembic
```

Повторный запуск (например, после добавления новой миграции и пересборки образа бэкенда). Job нельзя изменить после создания, поэтому его удаляют и создают заново:

```sh
kubectl delete job migrate
kubectl apply -f k8s/20-migrate.yaml
kubectl logs -f job/migrate
```

### docker-compose

```sh
docker compose up -d db
docker compose run --rm backend alembic upgrade head
```

### Локально, без Docker для бэкенда

База из docker-compose доступна на порту 5433:

```sh
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://palette_user:palette_pass@localhost:5433/palette_db alembic upgrade head
```

### Полезные команды Alembic

Выполняются из папки `backend/` с заданным `DATABASE_URL`.

| Команда | Что делает |
|---|---|
| `alembic current` | текущая версия схемы в базе |
| `alembic history` | список всех миграций |
| `alembic upgrade head` | применить все новые миграции |
| `alembic downgrade -1` | откатить последнюю миграцию |
| `alembic revision --autogenerate -m "описание"` | создать новую миграцию по изменениям в `app/models.py` (файл нужно проверить вручную) |
