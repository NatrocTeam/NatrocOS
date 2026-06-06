package main

import (
	"context"
	"os"

	"natrocos/internal/cli"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	os.Exit(cli.Execute(context.Background(), os.Args[1:], cli.Options{
		Commit:  commit,
		Date:    date,
		Stderr:  os.Stderr,
		Stdout:  os.Stdout,
		Version: version,
	}))
}
