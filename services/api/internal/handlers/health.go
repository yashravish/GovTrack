package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"

	internaldb "github.com/govtrack-demo/govtrack/services/api/internal/db"
)

func Health(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		res := gin.H{
			"status":  "ok",
			"db":      "ok",
			"version": "0.1.0",
		}

		if err := internaldb.Ping(c.Request.Context(), db); err != nil {
			res["db"] = "error"
			c.JSON(http.StatusServiceUnavailable, res)
			return
		}

		c.JSON(http.StatusOK, res)
	}
}

