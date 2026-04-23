package handlers

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	"github.com/govtrack-demo/govtrack/services/api/internal/seed"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

// Reseed wipes and reloads fixture datasets/records. Guarded by the
// X-Admin-Token header matching the configured ADMIN_TOKEN.
func Reseed(database *sqlx.DB, dsRepo *datasets.Repo, adminToken, fixturesDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(adminToken) == "" {
			respondError(c, http.StatusServiceUnavailable, "unavailable", "admin endpoint is not configured")
			return
		}

		provided := strings.TrimSpace(c.GetHeader("X-Admin-Token"))
		if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(adminToken)) != 1 {
			respondError(c, http.StatusUnauthorized, "unauthorized", "invalid admin token")
			return
		}

		dir := strings.TrimSpace(fixturesDir)
		if dir == "" {
			dir = "fixtures"
		}

		if err := seed.LoadFixtures(c.Request.Context(), dsRepo, dir); err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "reseed failed: "+err.Error())
			return
		}

		var dsCount int
		var recCount int
		_ = database.GetContext(c.Request.Context(), &dsCount, `SELECT count(*) FROM datasets WHERE source_type = 'fixture'`)
		_ = database.GetContext(c.Request.Context(), &recCount, `SELECT count(*) FROM records`)

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"datasets": dsCount,
			"records":  recCount,
		})
	}
}
