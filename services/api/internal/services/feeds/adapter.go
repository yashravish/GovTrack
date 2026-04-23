package feeds

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/govtrack-demo/govtrack/services/api/internal/models"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

type CDCAdapter struct {
	client *SocrataClient
	repo   *datasets.Repo
}

func NewCDCAdapter(client *SocrataClient, repo *datasets.Repo) *CDCAdapter {
	return &CDCAdapter{client: client, repo: repo}
}

func (a *CDCAdapter) Refresh(ctx context.Context) (count int, err error) {
	ds := models.Dataset{
		Slug:        "cdc_respiratory_weekly",
		Category:    "healthcare",
		Title:       "CDC respiratory weekly",
		Description: "Live snapshot from CDC Socrata feed (synthetic ingestion).",
		SourceURL:   a.client.BaseURL(),
		SourceType:  "live",
		UpdatedAt:   time.Now().UTC(),
	}
	if err := a.repo.UpsertDataset(ctx, ds); err != nil {
		return 0, err
	}

	stored, err := a.repo.GetDatasetBySlug(ctx, ds.Slug)
	if err != nil {
		return 0, err
	}

	rows, err := a.client.Fetch(ctx, map[string]string{
		"$limit": "1000",
	})
	if err != nil {
		return 0, err
	}

	out := make([]datasets.RecordInput, 0, len(rows))
	for _, r := range rows {
		b, err := json.Marshal(r)
		if err != nil {
			return 0, err
		}
		indexed := buildIndexedText(r)
		out = append(out, datasets.RecordInput{
			Payload:     b,
			IndexedText: indexed,
		})
	}

	if err := a.repo.ReplaceRecords(ctx, stored.ID, out); err != nil {
		return 0, err
	}

	return len(out), nil
}

func buildIndexedText(row map[string]any) string {
	parts := make([]string, 0, 16)
	for _, v := range row {
		switch vv := v.(type) {
		case string:
			s := strings.TrimSpace(vv)
			if s != "" {
				parts = append(parts, s)
			}
		default:
			// ignore non-string values
		}
	}
	return strings.ToLower(strings.TrimSpace(strings.Join(parts, " ")))
}

func (a *CDCAdapter) String() string {
	return fmt.Sprintf("CDCAdapter(%s)", a.client.BaseURL())
}

