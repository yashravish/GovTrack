package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
	"github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/seed"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	database, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect db", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer func() { _ = database.Close() }()

	repo := datasets.NewRepo(database)
	if err := seed.LoadFixtures(context.Background(), repo, "fixtures"); err != nil {
		slog.Error("seed failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	var dsCount int
	var recCount int
	_ = database.Get(&dsCount, `SELECT count(*) FROM datasets WHERE source_type = 'fixture'`)
	_ = database.Get(&recCount, `SELECT count(*) FROM records`)

	fmt.Printf("loaded %d datasets, %d records\n", dsCount, recCount)
	slog.Info("seed complete", slog.Int("datasets", dsCount), slog.Int("records", recCount))
}

