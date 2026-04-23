package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/govtrack-demo/govtrack/services/api/internal/services/feeds"
)

func ListFeedHealth(tracker *feeds.Tracker) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, err := tracker.ListHealth(c.Request.Context())
		if err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to list feed health")
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

