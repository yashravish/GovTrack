package auth

import (
	"os"
	"sync"
)

var lastTokenMu sync.Mutex
var lastToken string

func MaybeSetLastMagicToken(token string) {
	if os.Getenv("APP_ENV") != "test" {
		return
	}
	lastTokenMu.Lock()
	lastToken = token
	lastTokenMu.Unlock()
}

func GetLastMagicToken() string {
	lastTokenMu.Lock()
	defer lastTokenMu.Unlock()
	return lastToken
}

