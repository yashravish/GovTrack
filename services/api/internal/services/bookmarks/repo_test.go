package bookmarks

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	internaldb "github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/middleware"
	"github.com/govtrack-demo/govtrack/services/api/internal/models"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
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

func cleanup(t *testing.T, db *sqlx.DB) {
	t.Helper()
	_, err := db.Exec(`TRUNCATE TABLE bookmarks, records, datasets RESTART IDENTITY CASCADE;`)
	require.NoError(t, err)
}

func TestRepo_AddListRemove_Device(t *testing.T) {
	db := mustDB(t)
	cleanup(t, db)

	dsRepo := datasets.NewRepo(db)
	require.NoError(t, dsRepo.UpsertDataset(context.Background(), models.Dataset{
		Slug:        "x",
		Category:    "healthcare",
		Title:       "X",
		Description: "X",
		SourceURL:   "fixtures/x.csv",
		SourceType:  "fixture",
	}))
	ds, err := dsRepo.GetDatasetBySlug(context.Background(), "x")
	require.NoError(t, err)

	r := NewRepo(db)
	dev := "device-abc123"
	p := middleware.Principal{DeviceID: &dev}

	require.NoError(t, r.Add(context.Background(), p, ds.ID))
	require.NoError(t, r.Add(context.Background(), p, ds.ID)) // idempotent

	got, err := r.List(context.Background(), p)
	require.NoError(t, err)
	require.Len(t, got, 1)

	require.NoError(t, r.Remove(context.Background(), p, ds.ID))
	got2, err := r.List(context.Background(), p)
	require.NoError(t, err)
	require.Len(t, got2, 0)
}

func TestRepo_Add_User(t *testing.T) {
	db := mustDB(t)
	cleanup(t, db)

	dsRepo := datasets.NewRepo(db)
	require.NoError(t, dsRepo.UpsertDataset(context.Background(), models.Dataset{
		Slug:        "y",
		Category:    "healthcare",
		Title:       "Y",
		Description: "Y",
		SourceURL:   "fixtures/y.csv",
		SourceType:  "fixture",
	}))
	ds, err := dsRepo.GetDatasetBySlug(context.Background(), "y")
	require.NoError(t, err)

	r := NewRepo(db)
	var uid uuid.UUID
	require.NoError(t, db.Get(&uid, `INSERT INTO users (email) VALUES ('u@example.com') RETURNING id`))
	p := middleware.Principal{UserID: &uid}
	require.NoError(t, r.Add(context.Background(), p, ds.ID))

	got, err := r.List(context.Background(), p)
	require.NoError(t, err)
	require.Len(t, got, 1)
}

