package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"natrocos/apps/gateway/internal/server"
)

func main() {
	addr := os.Getenv("NATROCOS_GATEWAY_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           server.New(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("natrocos-gateway listening on http://%s", addr)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
