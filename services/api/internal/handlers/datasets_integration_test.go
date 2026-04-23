package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/db"
	"github.com/govtrack-demo/govtrack/services/api/internal/handlers"
	"github.com/govtrack-demo/govtrack/services/api/internal/seed"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
	"github.com/govtrack-demo/govtrack/services/api/internal/testutil"
)

var testDB *sqlx.DB

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)

	dsn := "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable"
	var err error
	testDB, err = db.Connect(context.Background(), dsn)
	if err != nil {
		os.Exit(1)
	}
	defer func() { _ = testDB.Close() }()

	_ = testutil.AcquireGlobalDBLock(context.Background(), testDB)
	defer func() { _ = testutil.ReleaseGlobalDBLock(context.Background(), testDB) }()

	_, _ = testDB.Exec(`TRUNCATE TABLE records, datasets RESTART IDENTITY CASCADE;`)

	repo := datasets.NewRepo(testDB)
	_ = seed.LoadFixtures(context.Background(), repo, "../../fixtures")

	code := m.Run()
	os.Exit(code)
}

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	repo := datasets.NewRepo(testDB)
	svc := datasets.NewService(repo)

	r := gin.New()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Device-ID"},
		AllowCredentials: false,
	}))

	v1 := r.Group("/api/v1")
	{
		v1.GET("/categories", handlers.ListCategories(svc))
		ds := v1.Group("/datasets")
		ds.GET("", handlers.ListDatasets(svc))
		ds.GET("/:slug", handlers.GetDataset(svc))
		ds.GET("/:slug/records", handlers.ListRecords(svc))
		ds.GET("/:slug/stats", handlers.DatasetStats(svc))
	}

	return httptest.NewServer(r)
}

func getJSON(t *testing.T, baseURL, path string) map[string]any {
	t.Helper()
	resp, err := http.Get(baseURL + path)
	require.NoError(t, err)
	defer resp.Body.Close()

	var out map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&out))
	out["_status"] = float64(resp.StatusCode)
	return out
}

func TestDatasets_ListAndFilter(t *testing.T) {
	s := newTestServer(t)
	defer s.Close()

	out := getJSON(t, s.URL, "/api/v1/datasets?page=1&page_size=2")
	require.Equal(t, float64(200), out["_status"])
	data := out["data"].([]any)
	require.Len(t, data, 2)
	require.Equal(t, float64(1), out["page"])
	require.Equal(t, float64(2), out["page_size"])
	require.True(t, out["total"].(float64) >= 4)

	out2 := getJSON(t, s.URL, "/api/v1/datasets?category=healthcare")
	require.Equal(t, float64(200), out2["_status"])
	data2 := out2["data"].([]any)
	require.True(t, len(data2) >= 1)
	first := data2[0].(map[string]any)
	require.Equal(t, "healthcare", first["category"])

	out3 := getJSON(t, s.URL, "/api/v1/datasets?q=ridership")
	require.Equal(t, float64(200), out3["_status"])
	require.True(t, out3["total"].(float64) >= 1)
}

func TestDatasets_GetBySlug_200_404(t *testing.T) {
	s := newTestServer(t)
	defer s.Close()

	ok := getJSON(t, s.URL, "/api/v1/datasets/healthcare_access")
	require.Equal(t, float64(200), ok["_status"])
	require.NotEmpty(t, ok["title"])

	resp, err := http.Get(s.URL + "/api/v1/datasets/nope")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, 404, resp.StatusCode)
}

func TestDatasets_RecordsAndStats(t *testing.T) {
	s := newTestServer(t)
	defer s.Close()

	recs := getJSON(t, s.URL, "/api/v1/datasets/healthcare_access/records?page=1&page_size=20")
	require.Equal(t, float64(200), recs["_status"])
	require.True(t, recs["total"].(float64) >= 1)
	require.Len(t, recs["data"].([]any), 20)

	stats := getJSON(t, s.URL, "/api/v1/datasets/healthcare_access/stats")
	require.Equal(t, float64(200), stats["_status"])
	require.NotNil(t, stats["count"])
	require.NotNil(t, stats["min"])
	require.NotNil(t, stats["max"])
	require.NotNil(t, stats["mean"])
}

func TestDatasets_Categories(t *testing.T) {
	s := newTestServer(t)
	defer s.Close()

	resp, err := http.Get(s.URL + "/api/v1/categories")
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, 200, resp.StatusCode)

	var cats []map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&cats))
	require.Len(t, cats, 4)
}

