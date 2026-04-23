package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/handlers"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

const testAdminToken = "test-admin-token"

func newAdminServer(t *testing.T) *httptest.Server {
	t.Helper()
	repo := datasets.NewRepo(testDB)

	r := gin.New()
	r.POST("/api/v1/admin/reseed", handlers.Reseed(testDB, repo, testAdminToken, "../../fixtures"))
	return httptest.NewServer(r)
}

func TestAdmin_Reseed_401_WithoutToken(t *testing.T) {
	s := newAdminServer(t)
	defer s.Close()

	resp, err := http.Post(s.URL+"/api/v1/admin/reseed", "application/json", nil)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAdmin_Reseed_401_WithWrongToken(t *testing.T) {
	s := newAdminServer(t)
	defer s.Close()

	req, err := http.NewRequest(http.MethodPost, s.URL+"/api/v1/admin/reseed", nil)
	require.NoError(t, err)
	req.Header.Set("X-Admin-Token", "nope")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestAdmin_Reseed_200_WithToken(t *testing.T) {
	s := newAdminServer(t)
	defer s.Close()

	req, err := http.NewRequest(http.MethodPost, s.URL+"/api/v1/admin/reseed", strings.NewReader(""))
	require.NoError(t, err)
	req.Header.Set("X-Admin-Token", testAdminToken)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.Equal(t, "ok", body["status"])
	require.GreaterOrEqual(t, body["datasets"].(float64), float64(4))
	require.GreaterOrEqual(t, body["records"].(float64), float64(1))
}
