package cli

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"natrocos/internal/natrocos"
)

func TestVersionJSON(t *testing.T) {
	t.Parallel()

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--json", "version"}, Options{
		Commit:  "abc123",
		Date:    "2026-06-06",
		Stdout:  stdout,
		Version: "v0.1.0",
	})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}

	var payload map[string]string
	if err := json.Unmarshal([]byte(stdout.String()), &payload); err != nil {
		t.Fatalf("expected json output: %v", err)
	}
	if payload["version"] != "v0.1.0" {
		t.Fatalf("expected version v0.1.0, got %q", payload["version"])
	}
}

func TestStatusCallsGateway(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != natrocos.RouteSystem {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, natrocos.SystemSummary{
			NodeName: "test-node",
			Uptime:   "1h",
			DataRoot: natrocos.DataRoot,
			Metrics: []natrocos.SystemMetric{
				{Key: "cpu", Value: "10%", Series: []int{1, 2}},
			},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "status"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "test-node") {
		t.Fatalf("expected status output to include node name, got %s", stdout.String())
	}
}

func TestSetupOwnerPostsFirstOwner(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/setup/owner" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		var request natrocos.CreateOwnerRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode setup owner request: %v", err)
		}
		if request.Username != "surya" || request.DisplayName != "Surya" || request.Password != "natrocos-local" {
			t.Fatalf("unexpected setup owner request: %+v", request)
		}

		writeTestJSON(t, w, natrocos.UserSession{
			UserID:      "usr_owner",
			Username:    "surya",
			DisplayName: "Surya",
			Role:        natrocos.RoleOwner,
			AccessToken: "test-token",
			ExpiresAt:   "2030-01-01T00:00:00Z",
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(
		context.Background(),
		[]string{"--api-url", server.URL, "setup", "owner", "--username", "surya", "--display-name", "Surya", "--password-stdin"},
		Options{Stdin: strings.NewReader("natrocos-local\n"), Stdout: stdout},
	)

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "role: owner") {
		t.Fatalf("expected owner role output, got %s", stdout.String())
	}
}

func TestAppStartPostsAction(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/apps/syncthing/start" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, natrocos.AppActionResponse{
			App: natrocos.AppInstance{
				ID:     "syncthing",
				Status: "running",
			},
			Apps: []natrocos.AppInstance{
				{ID: "syncthing", Status: "running"},
			},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "app", "start", "syncthing"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "syncthing: running") {
		t.Fatalf("expected action output, got %s", stdout.String())
	}
}

func TestStoreInstallDryRunDoesNotPost(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("dry-run should only GET catalog, got %s", r.Method)
		}
		if r.URL.Path != natrocos.RouteStore {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, []natrocos.StoreApp{
			{
				ID:    "jellyfin",
				Name:  "Jellyfin",
				Image: "jellyfin/jellyfin:10.10",
			},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "install", "jellyfin", "--dry-run"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "no changes applied") {
		t.Fatalf("expected dry-run output, got %s", stdout.String())
	}
}

func TestStoreInstallPostsQueueRequest(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/store/jellyfin/install" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, natrocos.StoreInstallResponse{
			AppID:    "jellyfin",
			JobID:    "install_test",
			QueuedAt: "2030-01-01T00:00:00Z",
			Status:   "queued",
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "install", "jellyfin"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "jellyfin: queued") {
		t.Fatalf("expected queued output, got %s", stdout.String())
	}
	if !strings.Contains(stdout.String(), "install_test") {
		t.Fatalf("expected install job id output, got %s", stdout.String())
	}
}

func TestStoreQueueListCallsGateway(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("expected GET, got %s", r.Method)
		}
		if r.URL.Path != natrocos.RouteAppManagementInstallQueue {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, []natrocos.StoreInstallJob{
			{
				JobID:  "install_test",
				Status: natrocos.StoreInstallJobReady,
				App:    natrocos.StoreApp{ID: "jellyfin"},
				Plan:   natrocos.StoreInstallPlan{Image: "jellyfin/jellyfin:10.10"},
			},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "queue", "list"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "install_test") {
		t.Fatalf("expected queue job output, got %s", stdout.String())
	}
}

func TestStoreQueueProcessPostsToGateway(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/app-management/install-queue/process" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		writeTestJSON(t, w, natrocos.StoreInstallQueueProcessResponse{
			Processed: 1,
			Ready:     1,
			Jobs: []natrocos.StoreInstallJob{
				{
					JobID:  "install_test",
					Status: natrocos.StoreInstallJobReady,
					App:    natrocos.StoreApp{ID: "jellyfin"},
					Plan:   natrocos.StoreInstallPlan{ComposePath: "/NatrocOS/apps/jellyfin/compose.yaml"},
				},
			},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "queue", "process"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "processed: 1") {
		t.Fatalf("expected process output, got %s", stdout.String())
	}
}

func TestStoreQueueDeployDefaultsToDryRun(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/app-management/install-queue/install_test/deploy" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		var request natrocos.StoreInstallDeployRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode deploy request: %v", err)
		}
		if !request.DryRun || request.Confirm || request.Pull {
			t.Fatalf("expected default dry-run request, got %+v", request)
		}

		writeTestJSON(t, w, natrocos.StoreInstallDeployResponse{
			Job:     natrocos.StoreInstallJob{JobID: "install_test", Status: natrocos.StoreInstallJobReady},
			DryRun:  true,
			Command: []string{"docker", "compose", "up", "-d"},
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "queue", "deploy", "install_test"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "mode: dry-run") {
		t.Fatalf("expected dry-run output, got %s", stdout.String())
	}
}

func TestStoreQueueDeployConfirmedWithPull(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/app-management/install-queue/install_test/deploy" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}

		var request natrocos.StoreInstallDeployRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatalf("decode deploy request: %v", err)
		}
		if request.DryRun || !request.Confirm || !request.Pull {
			t.Fatalf("expected confirmed pull request, got %+v", request)
		}

		writeTestJSON(t, w, natrocos.StoreInstallDeployResponse{
			Job:     natrocos.StoreInstallJob{JobID: "install_test", Status: natrocos.StoreInstallJobDeployed},
			DryRun:  false,
			Command: []string{"docker", "compose", "up", "-d", "--pull", "always"},
			Output:  "container started",
		})
	}))
	t.Cleanup(server.Close)

	stdout := &strings.Builder{}
	exit := Execute(context.Background(), []string{"--api-url", server.URL, "store", "queue", "deploy", "install_test", "--yes", "--pull"}, Options{Stdout: stdout})

	if exit != ExitSuccess {
		t.Fatalf("expected exit %d, got %d", ExitSuccess, exit)
	}
	if !strings.Contains(stdout.String(), "mode: executed") {
		t.Fatalf("expected executed output, got %s", stdout.String())
	}
	if !strings.Contains(stdout.String(), "container started") {
		t.Fatalf("expected deploy output, got %s", stdout.String())
	}
}

func TestStoreQueueDeployRejectsDryRunWithYes(t *testing.T) {
	t.Parallel()

	stderr := &strings.Builder{}
	exit := Execute(context.Background(), []string{"store", "queue", "deploy", "install_test", "--dry-run", "--yes"}, Options{Stderr: stderr})

	if exit != ExitInvalidUsage {
		t.Fatalf("expected exit %d, got %d", ExitInvalidUsage, exit)
	}
	if !strings.Contains(stderr.String(), "cannot be used together") {
		t.Fatalf("expected dry-run yes validation error, got %s", stderr.String())
	}
}

func TestUnknownCommand(t *testing.T) {
	t.Parallel()

	stderr := &strings.Builder{}
	exit := Execute(context.Background(), []string{"unknown"}, Options{Stderr: stderr})

	if exit != ExitInvalidUsage {
		t.Fatalf("expected exit %d, got %d", ExitInvalidUsage, exit)
	}
	if !strings.Contains(stderr.String(), "unknown command") {
		t.Fatalf("expected unknown command error, got %s", stderr.String())
	}
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, payload any) {
	t.Helper()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		t.Fatalf("write test json: %v", err)
	}
}
