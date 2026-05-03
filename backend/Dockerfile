# DevFlow PHP backend — FrankenPHP on Railway with MySQLi (fixes mysqli_connect undefined).
# Railway: set service Root Directory to `backend` and deploy; expose PORT from env.

FROM dunglas/frankenphp:1-php8.3-bookworm

WORKDIR /app

RUN install-php-extensions mysqli pdo_mysql

# App source (see .dockerignore)
COPY . /app

ENV PORT=8080

EXPOSE 8080

# Railway injects GITHUB_WEBHOOK_SECRET at runtime only. Dockerfile must use $$ so BUILD does not strip $…
# (see https://docs.docker.com/reference/dockerfile/#environment-replacement).
# Explicit env … frankenPHP gives PHP getenv() reliable access for api/github/webhook.php.
CMD ["frankenphp", "run", "--config", "/app/Caddyfile"]