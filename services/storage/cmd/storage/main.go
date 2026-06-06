package main

import (
	"errors"
	"log"
	"net/http"

	"natrocos/internal/servicekit"
)

func main() {
	err := servicekit.ListenAndServe(servicekit.Config{
		ServiceName: "natrocos-storage",
		EnvAddr:     "NATROCOS_STORAGE_ADDR",
		DefaultAddr: "127.0.0.1:8083",
	})
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
