package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/govtrack-demo/govtrack/services/api/internal/middleware"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/bookmarks"
	"github.com/govtrack-demo/govtrack/services/api/internal/services/datasets"
)

func AddBookmark(bRepo *bookmarks.Repo, dRepo *datasets.Repo) gin.HandlerFunc {
	type req struct {
		DatasetSlug string `json:"dataset_slug"`
	}

	return func(c *gin.Context) {
		var r req
		if err := c.ShouldBindJSON(&r); err != nil {
			respondError(c, http.StatusBadRequest, "validation", "invalid body")
			return
		}
		slug := strings.TrimSpace(r.DatasetSlug)
		if slug == "" {
			respondError(c, http.StatusBadRequest, "validation", "dataset_slug required")
			return
		}

		ds, err := dRepo.GetDatasetBySlug(c.Request.Context(), slug)
		if err != nil {
			if err == datasets.ErrNotFound {
				respondError(c, http.StatusNotFound, "not_found", "dataset not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "internal", "failed to load dataset")
			return
		}

		pAny, ok := c.Get(middleware.PrincipalKey)
		if !ok {
			respondError(c, http.StatusUnauthorized, "unauthorized", "missing principal")
			return
		}
		p, _ := pAny.(middleware.Principal)

		if err := bRepo.Add(c.Request.Context(), p, ds.ID); err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to add bookmark")
			return
		}

		c.JSON(http.StatusOK, ds)
	}
}

func RemoveBookmark(bRepo *bookmarks.Repo, dRepo *datasets.Repo) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := strings.TrimSpace(c.Param("slug"))
		if slug == "" {
			respondError(c, http.StatusBadRequest, "validation", "slug required")
			return
		}

		ds, err := dRepo.GetDatasetBySlug(c.Request.Context(), slug)
		if err != nil {
			if err == datasets.ErrNotFound {
				respondError(c, http.StatusNotFound, "not_found", "dataset not found")
				return
			}
			respondError(c, http.StatusInternalServerError, "internal", "failed to load dataset")
			return
		}

		pAny, ok := c.Get(middleware.PrincipalKey)
		if !ok {
			respondError(c, http.StatusUnauthorized, "unauthorized", "missing principal")
			return
		}
		p, _ := pAny.(middleware.Principal)

		if err := bRepo.Remove(c.Request.Context(), p, ds.ID); err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to remove bookmark")
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func ListBookmarks(bRepo *bookmarks.Repo) gin.HandlerFunc {
	return func(c *gin.Context) {
		pAny, ok := c.Get(middleware.PrincipalKey)
		if !ok {
			respondError(c, http.StatusUnauthorized, "unauthorized", "missing principal")
			return
		}
		p, _ := pAny.(middleware.Principal)

		out, err := bRepo.List(c.Request.Context(), p)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to list bookmarks")
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": out})
	}
}

func MigrateBookmarks(bRepo *bookmarks.Repo) gin.HandlerFunc {
	return func(c *gin.Context) {
		deviceID := strings.TrimSpace(c.GetHeader("X-Device-ID"))
		if !middleware.ValidateDeviceID(deviceID) {
			respondError(c, http.StatusBadRequest, "validation", "invalid device id")
			return
		}

		userAny, ok := c.Get(middleware.UserIDKey)
		if !ok {
			respondError(c, http.StatusUnauthorized, "unauthorized", "missing user")
			return
		}
		userID, ok := userAny.(uuid.UUID)
		if !ok {
			respondError(c, http.StatusUnauthorized, "unauthorized", "missing user")
			return
		}

		n, err := bRepo.MigrateDeviceToUser(c.Request.Context(), deviceID, userID)
		if err != nil {
			respondError(c, http.StatusInternalServerError, "internal", "failed to migrate bookmarks")
			return
		}

		c.JSON(http.StatusOK, gin.H{"migrated": n})
	}
}

