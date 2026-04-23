package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

func ListDatasets(svc *datasets.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, pageSize, err := parsePagination(c)
		if err != nil {
			respondError(c, http.StatusBadRequest, "validation", err.Error())
			return
		}

		category := strings.TrimSpace(c.Query("category"))
		q := strings.TrimSpace(c.Query("q"))

		data, total, err := svc.ListDatasets(c.Request.Context(), category, q, page, pageSize)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to list datasets")
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":      data,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		})
	}
}

func GetDataset(svc *datasets.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		ds, err := svc.GetDatasetBySlug(c.Request.Context(), slug)
		if err != nil {
			if err == datasets.ErrNotFound {
				respondError(c, http.StatusNotFound, "not_found", "dataset not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "internal", "failed to load dataset")
			return
		}
		c.JSON(http.StatusOK, ds)
	}
}

func ListRecords(svc *datasets.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, pageSize, err := parsePagination(c)
		if err != nil {
			respondError(c, http.StatusBadRequest, "validation", err.Error())
			return
		}

		slug := c.Param("slug")
		q := strings.TrimSpace(c.Query("q"))

		records, total, err := svc.ListRecordsBySlug(c.Request.Context(), slug, q, page, pageSize)
		if err != nil {
			if err == datasets.ErrNotFound {
				respondError(c, http.StatusNotFound, "not_found", "dataset not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "internal", "failed to list records")
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":      records,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		})
	}
}

func DatasetStats(svc *datasets.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := c.Param("slug")
		stats, err := svc.DatasetStatsBySlug(c.Request.Context(), slug)
		if err != nil {
			if err == datasets.ErrNotFound {
				respondError(c, http.StatusNotFound, "not_found", "dataset not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "internal", "failed to compute stats")
			return
		}
		c.JSON(http.StatusOK, stats)
	}
}

func ListCategories(svc *datasets.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		out, err := svc.ListCategories(c.Request.Context())
		if err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to list categories")
			return
		}
		c.JSON(http.StatusOK, out)
	}
}

