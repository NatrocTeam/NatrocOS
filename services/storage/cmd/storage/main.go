package main

import (
	"errors"
	"log"
	"net/http"
	"os"

	"natrocos/services/storage/internal/server"
)

func main() {
	addr := os.Getenv("NATROCOS_STORAGE_ADDR")
	if addr == "" {
		addr = server.DefaultAddr()
	}

	if err := server.ListenAndServe(addr, server.Options{
		DataRoot: os.Getenv("NATROCOS_DATA_ROOT"),
	}); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
