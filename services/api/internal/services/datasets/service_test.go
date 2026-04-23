package datasets

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/models"
)

func TestService_SummaryStats(t *testing.T) {
	db := mustDB(t)
	cleanupDatasets(t, db)
	t.Cleanup(func() { cleanupDatasets(t, db) })

	repo := NewRepo(db)
	svc := NewService(repo)
	ctx := context.Background()

	require.NoError(t, repo.UpsertDataset(ctx, models.Dataset{
		Slug:        "stats_test",
		Category:    "healthcare",
		Title:       "Stats test",
		Description: "Test",
		SourceURL:   "fixtures/stats.csv",
		SourceType:  "fixture",
	}))
	ds, err := repo.GetDatasetBySlug(ctx, "stats_test")
	require.NoError(t, err)

	rows := []RecordInput{
		{Payload: []byte(`{"value":1}`), IndexedText: "a"},
		{Payload: []byte(`{"value":2}`), IndexedText: "b"},
		{Payload: []byte(`{"value":3}`), IndexedText: "c"},
		{Payload: []byte(`{"value":4}`), IndexedText: "d"},
		{Payload: []byte(`{"value":5}`), IndexedText: "e"},
	}
	require.NoError(t, repo.InsertRecords(ctx, ds.ID, rows))

	stats, err := svc.SummaryStats(ctx, ds.ID)
	require.NoError(t, err)

	require.Equal(t, 5, stats["count"])
	require.InDelta(t, 1.0, stats["min"].(float64), 0.0001)
	require.InDelta(t, 5.0, stats["max"].(float64), 0.0001)
	require.InDelta(t, 3.0, stats["mean"].(float64), 0.0001)
}

