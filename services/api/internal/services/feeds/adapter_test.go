package feeds

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	internaldb "github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/models"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

func mustDB(t *testing.T) *sqlx.DB {
	t.Helper()
	db, err := internaldb.Connect(context.Background(), "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func cleanup(t *testing.T, db *sqlx.DB) {
	t.Helper()
	_, err := db.Exec(`TRUNCATE TABLE feed_status, records, datasets RESTART IDENTITY CASCADE;`)
	require.NoError(t, err)
}

func TestCDCAdapter_Refresh_Success(t *testing.T) {
	db := mustDB(t)
	cleanup(t, db)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`[{"location":"TX","metric":"cases","value":"10"},{"location":"NJ","metric":"cases","value":"12"}]`))
	}))
	defer srv.Close()

	repo := datasets.NewRepo(db)
	client := NewSocrataClient(srv.URL)
	adapter := NewCDCAdapter(client, repo)
	tracker := NewTracker(db)

	start := time.Now()
	n, err := adapter.Refresh(context.Background())
	lat := int(time.Since(start).Milliseconds())
	require.NoError(t, err)
	require.Equal(t, 2, n)

	ds, err := repo.GetDatasetBySlug(context.Background(), "cdc_respiratory_weekly")
	require.NoError(t, err)
	require.NoError(t, tracker.RecordSuccess(context.Background(), ds.ID, lat))

	health, err := tracker.ListHealth(context.Background())
	require.NoError(t, err)
	require.Len(t, health, 1)
	require.Equal(t, "cdc_respiratory_weekly", health[0].Slug)
}

func TestCDCAdapter_Refresh_500_RecordsFailure(t *testing.T) {
	db := mustDB(t)
	cleanup(t, db)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(500)
	}))
	defer srv.Close()

	repo := datasets.NewRepo(db)
	client := NewSocrataClient(srv.URL)
	adapter := NewCDCAdapter(client, repo)
	tracker := NewTracker(db)

	// Ensure dataset exists so failure can be recorded against its ID.
	require.NoError(t, repo.UpsertDataset(context.Background(), models.Dataset{
		Slug:        "cdc_respiratory_weekly",
		Category:    "healthcare",
		Title:       "CDC respiratory weekly",
		Description: "Live snapshot from CDC Socrata feed (synthetic ingestion).",
		SourceURL:   client.BaseURL(),
		SourceType:  "live",
	}))
	ds, err := repo.GetDatasetBySlug(context.Background(), "cdc_respiratory_weekly")
	require.NoError(t, err)

	start := time.Now()
	_, err = adapter.Refresh(context.Background())
	lat := int(time.Since(start).Milliseconds())
	require.Error(t, err)

	require.NoError(t, tracker.RecordFailure(context.Background(), ds.ID, lat, err.Error()))

	var recCount int
	require.NoError(t, db.Get(&recCount, `SELECT count(*) FROM records`))
	require.Equal(t, 0, recCount)
}

func TestSocrataClient_Fetch_Timeout(t *testing.T) {
	// Server that never responds within test timeout.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer srv.Close()

	c := NewSocrataClient(srv.URL)
	c.http.Timeout = 50 * time.Millisecond

	ctx := context.Background()
	_, err := c.Fetch(ctx, map[string]string{"$limit": "1"})
	require.Error(t, err)
}

