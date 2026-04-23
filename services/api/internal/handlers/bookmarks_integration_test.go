package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/config"
	"github.com/govtrack-demo/govtrack/services/api/internal/handlers"
	"github.com/govtrack-demo/govtrack/services/api/internal/middleware"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/auth"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/bookmarks"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

var bmCfg = &config.Config{
	DatabaseURL:      "postgres://govtrack:govtrack@localhost:5432/govtrack?sslmode=disable",
	JWTSigningKey:    "dev-only-change-me-32chars-minimum",
	MagicLinkBaseURL: "govtrack://auth",
	AllowedOrigins:   []string{"*"},
}

type captureMailer struct{ html string }

func (m *captureMailer) Send(ctx context.Context, to, subject, html string) error {
	_ = ctx
	_ = to
	_ = subject
	m.html = html
	return nil
}

func mustJWT(t *testing.T) string {
	t.Helper()

	mailer := &captureMailer{}
	svc := auth.NewService(testDB, mailer, bmCfg)

	require.NoError(t, svc.RequestMagicLink(context.Background(), "bm@example.com"))
	re := regexp.MustCompile(`token=([a-zA-Z0-9_-]+)`)
	m := re.FindStringSubmatch(mailer.html)
	require.Len(t, m, 2)
	token := strings.TrimSpace(m[1])
	require.NotEmpty(t, token)

	j, _, _, err := svc.VerifyMagicLink(context.Background(), token)
	require.NoError(t, err)
	return j
}

func newBMServer(t *testing.T) *httptest.Server {
	t.Helper()

	dsRepo := datasets.NewRepo(testDB)
	dsSvc := datasets.NewService(dsRepo)
	bRepo := bookmarks.NewRepo(testDB)

	r := gin.New()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Device-ID"},
		AllowCredentials: false,
	}))

	v1 := r.Group("/api/v1")
	{
		ds := v1.Group("/datasets")
		ds.GET("", handlers.ListDatasets(dsSvc))

		// Use shared testDB from datasets integration TestMain.
		bm := v1.Group("/bookmarks", middleware.RequirePrincipal(testDB, bmCfg))
		bm.POST("", handlers.AddBookmark(bRepo, dsRepo))
		bm.DELETE("/:slug", handlers.RemoveBookmark(bRepo, dsRepo))
		bm.GET("", handlers.ListBookmarks(bRepo))

		bmAuth := v1.Group("/bookmarks", middleware.RequireAuth(testDB, bmCfg))
		bmAuth.POST("/migrate", handlers.MigrateBookmarks(bRepo))
	}

	return httptest.NewServer(r)
}

func TestBookmarks_DeviceFlow(t *testing.T) {
	_, _ = testDB.Exec(`TRUNCATE TABLE bookmarks, sessions, magic_tokens, users RESTART IDENTITY CASCADE;`)

	s := newBMServer(t)
	defer s.Close()

	reqBody := `{"dataset_slug":"healthcare_access"}`
	req, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-ID", "dev-1-abc1234")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode)
	resp.Body.Close()

	req2, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	req2.Header.Set("X-Device-ID", "dev-1-abc1234")
	resp2, err := http.DefaultClient.Do(req2)
	require.NoError(t, err)
	require.Equal(t, 200, resp2.StatusCode)
	var out map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&out))
	resp2.Body.Close()
	require.Len(t, out["data"].([]any), 1)

	// Duplicate POST is idempotent.
	req3, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("X-Device-ID", "dev-1-abc1234")
	resp3, err := http.DefaultClient.Do(req3)
	require.NoError(t, err)
	require.Equal(t, 200, resp3.StatusCode)
	resp3.Body.Close()

	// Cross principal isolation.
	req4, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	req4.Header.Set("X-Device-ID", "dev-2-xyz98765")
	resp4, err := http.DefaultClient.Do(req4)
	require.NoError(t, err)
	require.Equal(t, 200, resp4.StatusCode)
	var out2 map[string]any
	require.NoError(t, json.NewDecoder(resp4.Body).Decode(&out2))
	resp4.Body.Close()
	require.Len(t, out2["data"].([]any), 0)

	// Delete.
	req5, _ := http.NewRequest(http.MethodDelete, s.URL+"/api/v1/bookmarks/healthcare_access", nil)
	req5.Header.Set("X-Device-ID", "dev-1-abc1234")
	resp5, err := http.DefaultClient.Do(req5)
	require.NoError(t, err)
	require.Equal(t, 204, resp5.StatusCode)
	resp5.Body.Close()

	req6, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	req6.Header.Set("X-Device-ID", "dev-1-abc1234")
	resp6, err := http.DefaultClient.Do(req6)
	require.NoError(t, err)
	var out3 map[string]any
	require.NoError(t, json.NewDecoder(resp6.Body).Decode(&out3))
	resp6.Body.Close()
	require.Len(t, out3["data"].([]any), 0)
}

func TestBookmarks_AuthFlowAnd401(t *testing.T) {
	_, _ = testDB.Exec(`TRUNCATE TABLE bookmarks, sessions, magic_tokens, users RESTART IDENTITY CASCADE;`)

	s := newBMServer(t)
	defer s.Close()

	jwt := mustJWT(t)

	// Auth add.
	reqBody := `{"dataset_slug":"healthcare_access"}`
	req, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+jwt)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	require.Equal(t, 200, resp.StatusCode)
	resp.Body.Close()

	// Auth list.
	req2, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	req2.Header.Set("Authorization", "Bearer "+jwt)
	resp2, err := http.DefaultClient.Do(req2)
	require.NoError(t, err)
	require.Equal(t, 200, resp2.StatusCode)
	var out map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&out))
	resp2.Body.Close()
	require.Len(t, out["data"].([]any), 1)

	// Missing both -> 401.
	req3, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	req3.Header.Set("Content-Type", "application/json")
	resp3, err := http.DefaultClient.Do(req3)
	require.NoError(t, err)
	require.Equal(t, 401, resp3.StatusCode)
	resp3.Body.Close()
}

func TestBookmarks_Migrate_DeviceToUser_Dedupes(t *testing.T) {
	_, _ = testDB.Exec(`TRUNCATE TABLE bookmarks, sessions, magic_tokens, users RESTART IDENTITY CASCADE;`)

	s := newBMServer(t)
	defer s.Close()

	jwt := mustJWT(t)

	// Create device bookmark (same dataset), then user bookmark for same dataset.
	reqBody := `{"dataset_slug":"healthcare_access"}`
	reqDev, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	reqDev.Header.Set("Content-Type", "application/json")
	reqDev.Header.Set("X-Device-ID", "dev-1-abc1234")
	respDev, err := http.DefaultClient.Do(reqDev)
	require.NoError(t, err)
	require.Equal(t, 200, respDev.StatusCode)
	respDev.Body.Close()

	reqUser, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks", strings.NewReader(reqBody))
	reqUser.Header.Set("Content-Type", "application/json")
	reqUser.Header.Set("Authorization", "Bearer "+jwt)
	respUser, err := http.DefaultClient.Do(reqUser)
	require.NoError(t, err)
	require.Equal(t, 200, respUser.StatusCode)
	respUser.Body.Close()

	// Migrate device -> user; should dedupe to 1.
	reqMig, _ := http.NewRequest(http.MethodPost, s.URL+"/api/v1/bookmarks/migrate", nil)
	reqMig.Header.Set("Authorization", "Bearer "+jwt)
	reqMig.Header.Set("X-Device-ID", "dev-1-abc1234")
	respMig, err := http.DefaultClient.Do(reqMig)
	require.NoError(t, err)
	require.Equal(t, 200, respMig.StatusCode)
	var migOut map[string]any
	require.NoError(t, json.NewDecoder(respMig.Body).Decode(&migOut))
	respMig.Body.Close()
	require.Contains(t, migOut, "migrated")

	// Device list should now be empty.
	reqDevList, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	reqDevList.Header.Set("X-Device-ID", "dev-1-abc1234")
	respDevList, err := http.DefaultClient.Do(reqDevList)
	require.NoError(t, err)
	require.Equal(t, 200, respDevList.StatusCode)
	var outDev map[string]any
	require.NoError(t, json.NewDecoder(respDevList.Body).Decode(&outDev))
	respDevList.Body.Close()
	require.Len(t, outDev["data"].([]any), 0)

	// User list should be exactly 1.
	reqUserList, _ := http.NewRequest(http.MethodGet, s.URL+"/api/v1/bookmarks", nil)
	reqUserList.Header.Set("Authorization", "Bearer "+jwt)
	respUserList, err := http.DefaultClient.Do(reqUserList)
	require.NoError(t, err)
	require.Equal(t, 200, respUserList.StatusCode)
	var outUser map[string]any
	require.NoError(t, json.NewDecoder(respUserList.Body).Decode(&outUser))
	respUserList.Body.Close()
	require.Len(t, outUser["data"].([]any), 1)
}

