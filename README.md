# MicroShop - 25 microservices on Kubernetes

Zero-dependency Node.js services (no npm install needed). Each service has its own folder, Dockerfile,
health/readiness endpoints, in-memory CRUD (`/items`), and a Kubernetes Deployment + Service.
`api-gateway` routes `/api/<service>/...` to every other service and exposes `/api/status`.

## Services
1. api-gateway
2. auth
3. user
4. profile
5. product
6. catalog
7. inventory
8. cart
9. order
10. payment
11. shipping
12. notification
13. email
14. sms
15. search
16. review
17. recommendation
18. wishlist
19. coupon
20. analytics
21. reporting
22. media
23. audit
24. settings
25. scheduler

## Run locally (Docker Compose)
```
docker compose up --build
curl localhost:8080/api/status
```

## Deploy to Kubernetes
```
./scripts/build.sh                    # build 25 images
./scripts/load-local.sh kind          # or: minikube  (skip for a real cluster, see below)
./scripts/deploy.sh                   # kubectl apply -k k8s
./scripts/test.sh http://localhost:30080
```
- kind: gateway NodePort 30080 needs a port mapping, or use `kubectl -n microshop port-forward svc/api-gateway 8080:8080` and test with `http://localhost:8080`.
- minikube: `minikube service api-gateway -n microshop --url`.
- Real cluster (EKS/etc): `REGISTRY=<your-dockerhub-user> ./scripts/build.sh`, then change `image:` in k8s/services/*.yaml
  (e.g. `sed -i 's#microshop/#<user>/microshop-#' k8s/services/*.yaml`) before deploying.

## Jenkins CI/CD
The `Jenkinsfile` builds all 25 images, pushes them to your registry, and deploys.
1. On the Jenkins agent install: docker, kubectl (and docker compose for that option). The jenkins user must be in the `docker` group.
2. Add credentials: `dockerhub-creds` (username/password) and `kubeconfig` (secret file).
3. Create a Pipeline job from this repo (Pipeline script from SCM, path `Jenkinsfile`).
4. Build with parameters: set `REGISTRY` to your Docker Hub user and choose `kubernetes` or `docker-compose`.

## Example
```
curl -X POST localhost:8080/api/order/items -H 'Content-Type: application/json' -d '{"product":"book"}'
curl localhost:8080/api/order/items
```

## Next steps
Add a real DB (Postgres/Redis StatefulSets or managed), secrets, and a Jenkins/GitHub Actions pipeline
that builds, pushes, and runs `kubectl apply -k k8s`.
