package datasets

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	internaldb "github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/models"
	"github.com/govtrack-demo/govtrack/services/api/internal/testutil"
)

func mustDB(t *testing.T) *sqlx.DB {
	t.Helper()
	db, err := internaldb.Connect(context.Background(), "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable")
	require.NoError(t, err)
	require.NoError(t, testutil.AcquireGlobalDBLock(context.Background(), db))
	t.Cleanup(func() {
		_ = testutil.ReleaseGlobalDBLock(context.Background(), db)
		_ = db.Close()
	})
	return db
}

func cleanupDatasets(t *testing.T, db *sqlx.DB) {
	t.Helper()
	_, err := db.Exec(`TRUNCATE TABLE records, datasets RESTART IDENTITY CASCADE;`)
	require.NoError(t, err)
}

func TestRepo_ListDatasets_Paginates(t *testing.T) {
	db := mustDB(t)
	cleanupDatasets(t, db)
	t.Cleanup(func() { cleanupDatasets(t, db) })

	repo := NewRepo(db)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		require.NoError(t, repo.UpsertDataset(ctx, models.Dataset{
			Slug:        "ds_" + uuid.NewString()[:8],
			Category:    "healthcare",
			Title:       "Test dataset",
			Description: "Test",
			SourceURL:   "fixtures/test.csv",
			SourceType:  "fixture",
		}))
	}

	page1, total, err := repo.ListDatasets(ctx, "healthcare", 2, 0)
	require.NoError(t, err)
	require.Equal(t, 3, total)
	require.Len(t, page1, 2)

	page2, total2, err := repo.ListDatasets(ctx, "healthcare", 2, 2)
	require.NoError(t, err)
	require.Equal(t, 3, total2)
	require.Len(t, page2, 1)
}

func TestRepo_SearchRecords(t *testing.T) {
	db := mustDB(t)
	cleanupDatasets(t, db)
	t.Cleanup(func() { cleanupDatasets(t, db) })

	repo := NewRepo(db)
	ctx := context.Background()

	require.NoError(t, repo.UpsertDataset(ctx, models.Dataset{
		Slug:        "air_quality_test",
		Category:    "environment",
		Title:       "Air quality test",
		Description: "Test",
		SourceURL:   "fixtures/air.csv",
		SourceType:  "fixture",
	}))
	ds, err := repo.GetDatasetBySlug(ctx, "air_quality_test")
	require.NoError(t, err)

	rows := []RecordInput{
		{Payload: []byte(`{"title":"Asthma outreach note","summary":"synthetic","region":"X","value":1}`), IndexedText: "Asthma outreach note synthetic X"},
		{Payload: []byte(`{"title":"Other note","summary":"synthetic","region":"Y","value":2}`), IndexedText: "Other note synthetic Y"},
	}
	require.NoError(t, repo.InsertRecords(ctx, ds.ID, rows))

	hits, total, err := repo.SearchRecords(ctx, ds.ID, "asthma", 10, 0)
	require.NoError(t, err)
	require.Equal(t, 1, total)
	require.Len(t, hits, 1)
}

