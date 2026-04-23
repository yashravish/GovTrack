package seed

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/govtrack-demo/govtrack/services/api/internal/models"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

func LoadFixtures(ctx context.Context, repo *datasets.Repo, fixturesDir string) error {
	type fixtureDef struct {
		File     string
		Slug     string
		Category string
		Title    string
		Desc     string
	}

	defs := []fixtureDef{
		{
			File:     "healthcare_access.csv",
			Slug:     "healthcare_access",
			Category: "healthcare",
			Title:    "Healthcare access",
			Desc:     "Synthetic clinic access signals by region.",
		},
		{
			File:     "transit_ridership.csv",
			Slug:     "transit_ridership",
			Category: "transportation",
			Title:    "Transit ridership",
			Desc:     "Synthetic monthly ridership totals for metro areas.",
		},
		{
			File:     "air_quality.csv",
			Slug:     "air_quality",
			Category: "environment",
			Title:    "Air quality (PM2.5)",
			Desc:     "Synthetic PM2.5 readings by county.",
		},
		{
			File:     "agency_reports.csv",
			Slug:     "agency_reports",
			Category: "agency_reports",
			Title:    "Agency reports",
			Desc:     "Synthetic public-sector report catalog entries.",
		},
	}

	for _, d := range defs {
		ds := models.Dataset{
			Slug:        d.Slug,
			Category:    d.Category,
			Title:       d.Title,
			Description: d.Desc,
			SourceURL:   filepath.ToSlash(filepath.Join("fixtures", d.File)),
			SourceType:  "fixture",
			UpdatedAt:   time.Now().UTC(),
		}

		if err := repo.UpsertDataset(ctx, ds); err != nil {
			return err
		}

		stored, err := repo.GetDatasetBySlug(ctx, d.Slug)
		if err != nil {
			return err
		}

		rows, err := readCSV(filepath.Join(fixturesDir, d.File))
		if err != nil {
			return err
		}

		if err := repo.DeleteRecordsForDataset(ctx, stored.ID); err != nil {
			return err
		}

		if err := repo.InsertRecords(ctx, stored.ID, rows); err != nil {
			return err
		}
	}

	return nil
}

func readCSV(path string) ([]datasets.RecordInput, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()

	r := csv.NewReader(f)
	r.FieldsPerRecord = -1

	header, err := r.Read()
	if err != nil {
		return nil, err
	}
	if len(header) < 6 || header[0] != "id" || header[1] != "title" || header[2] != "value" || header[3] != "region" || header[4] != "date" || header[5] != "summary" {
		return nil, fmt.Errorf("unexpected csv header in %s", path)
	}

	out := make([]datasets.RecordInput, 0, 64)
	for {
		rec, err := r.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		if len(rec) < 6 {
			continue
		}

		id := strings.TrimSpace(rec[0])
		title := strings.TrimSpace(rec[1])
		value := strings.TrimSpace(rec[2])
		region := strings.TrimSpace(rec[3])
		date := strings.TrimSpace(rec[4])
		summary := strings.TrimSpace(rec[5])

		payload := map[string]any{
			"id":      id,
			"title":   title,
			"value":   mustParseNumber(value),
			"region":  region,
			"date":    date,
			"summary": summary,
		}
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}

		indexed := strings.TrimSpace(strings.Join([]string{title, summary, region}, " "))
		out = append(out, datasets.RecordInput{
			Payload:     b,
			IndexedText: indexed,
		})
	}

	return out, nil
}

func mustParseNumber(s string) float64 {
	// CSV is trusted synthetic input; for simplicity treat parse errors as 0.
	// SummaryStats tests use known data inserted directly (not via seed).
	s = strings.TrimSpace(s)
	var f float64
	_, _ = fmt.Sscanf(s, "%f", &f)
	return f
}

