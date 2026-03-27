# DevFlow PHP backend — FrankenPHP on Railway with MySQLi (fixes mysqli_connect undefined).
# Railway: set service Root Directory to `backend` and deploy; expose PORT from env.

FROM dunglas/frankenphp:1-php8.3-bookworm

WORKDIR /app

RUN install-php-extensions mysqli pdo_mysql

# App source (see .dockerignore)
COPY . /app

ENV PORT=8080

EXPOSE 8080

CMD ["frankenphp", "run", "--config", "/app/Caddyfile"]
