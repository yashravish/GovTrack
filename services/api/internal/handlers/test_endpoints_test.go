package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/govtrack-demo/govtrack/services/api/internal/handlers"
)

func TestTestEndpoint_LastToken_404_WhenNotTestEnv(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/_test/last_token", handlers.LastToken())

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/_test/last_token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusNotFound, w.Code)
}

