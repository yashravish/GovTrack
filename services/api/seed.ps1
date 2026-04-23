$ErrorActionPreference = "Stop"

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

go run ./cmd/seed

