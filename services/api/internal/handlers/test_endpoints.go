package handlers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/govtrack-demo/govtrack/services/api/internal/services/auth"
)

// LastToken is a dev-only helper for Detox E2E.
// It is guarded by APP_ENV=test and returns 404 otherwise.
func LastToken() gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("APP_ENV") != "test" {
			c.Status(http.StatusNotFound)
			return
		}
		tok := auth.GetLastMagicToken()
		if tok == "" {
			c.Status(http.StatusNotFound)
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": tok})
	}
}

