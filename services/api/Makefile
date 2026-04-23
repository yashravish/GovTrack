.PHONY: lint test test-integration build run seed migrate-up migrate-down db-reset

DB_URL ?= postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable

lint:
	go vet ./...
	gofmt -l . | tee /dev/stderr | (! read)

migrate-up:
	migrate -path migrations -database "$(DB_URL)" up

migrate-down:
	migrate -path migrations -database "$(DB_URL)" down 1

db-reset:
	migrate -path migrations -database "$(DB_URL)" drop -f
	migrate -path migrations -database "$(DB_URL)" up

test:
	go test ./...

test-integration:
	go test ./internal/handlers/... -count=1

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server

seed:
	go run ./cmd/seed
