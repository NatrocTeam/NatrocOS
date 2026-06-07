package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"natrocos/apps/app-management/internal/server"
)

func main() {
	addr := os.Getenv("NATROCOS_APP_MANAGEMENT_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8081"
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           server.New(server.Options{DataRoot: os.Getenv("NATROCOS_DATA_ROOT")}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("natrocos-app-management listening on http://%s", addr)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
