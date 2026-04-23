package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func respondError(c *gin.Context, status int, code, msg string) {
	if status == 0 {
		status = http.StatusInternalServerError
	}
	c.JSON(status, gin.H{
		"error": gin.H{
			"code":    code,
			"message": msg,
		},
	})
}

