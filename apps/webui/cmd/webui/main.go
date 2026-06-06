package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"natrocos/apps/webui/internal/server"
)

const (
	defaultAPIURL = "http://127.0.0.1:8080"
	defaultAddr   = ":80"
)

func main() {
	addr := firstNonEmpty(os.Getenv("NATROCOS_WEBUI_ADDR"), defaultAddr)
	apiURL := firstNonEmpty(os.Getenv("NATROCOS_API_INTERNAL_URL"), defaultAPIURL)
	staticDir := firstNonEmpty(os.Getenv("NATROCOS_WEBUI_STATIC_DIR"), defaultStaticDir())

	handler, err := server.New(server.Options{
		APITargetURL: apiURL,
		StaticDir:    staticDir,
	})
	if err != nil {
		log.Fatal(err)
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("natrocos-webui listening on http://%s", addr)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func defaultStaticDir() string {
	installedDir := "/usr/share/natrocos/www"
	if _, err := os.Stat(installedDir); err == nil {
		return installedDir
	}

	return filepath.Join("apps", "web", "dist")
}
