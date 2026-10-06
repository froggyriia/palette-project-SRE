# Шпаргалка для скринкаста (5–7 минут)

```sh
minikube start
eval $(minikube docker-env)
docker build -t palette-backend:1.0 ./backend
docker build -t palette-frontend:1.0 ./frontend
kubectl apply -f k8s/               # запуск приложения и зависимостей
kubectl get pods -w                 # дождаться Running / Completed, затем Ctrl+C
kubectl get all
kubectl scale deployment backend --replicas=4
kubectl scale deployment frontend --replicas=3
kubectl get pods
kubectl port-forward svc/backend 8000:8000   # отдельный терминал
kubectl port-forward svc/frontend 5173:80    # отдельный терминал
```

Затем открыть http://localhost:5173: сгенерировать палитру, повернуть колесо, зарегистрироваться, сохранить палитру, открыть «Мои палитры».
