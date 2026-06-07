package main

import (
	"errors"
	"log"
	"net/http"
	"os"

	"natrocos/services/user/internal/server"
)

func main() {
	addr := os.Getenv("NATROCOS_USER_ADDR")
	if addr == "" {
		addr = server.DefaultAddr()
	}

	err := server.ListenAndServe(addr, server.Options{
		DataRoot: os.Getenv("NATROCOS_DATA_ROOT"),
	})
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
