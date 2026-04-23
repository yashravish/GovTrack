package handlers

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

func parsePagination(c *gin.Context) (page, pageSize int, err error) {
	page = 1
	pageSize = 20

	if v := c.Query("page"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 {
			return 0, 0, fmt.Errorf("invalid page")
		}
		page = n
	}

	if v := c.Query("page_size"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 || n > 100 {
			return 0, 0, fmt.Errorf("invalid page_size")
		}
		pageSize = n
	}

	return page, pageSize, nil
}

