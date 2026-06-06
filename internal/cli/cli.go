package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"natrocos/internal/natrocos"
)

const (
	ExitSuccess               = 0
	ExitGenericError          = 1
	ExitInvalidUsage          = 2
	ExitAPIUnavailable        = 3
	ExitAuthentication        = 4
	ExitPermissionDenied      = 5
	ExitNotFound              = 6
	ExitConflict              = 7
	ExitValidationFailed      = 8
	ExitTimedOut              = 9
	ExitDestructiveRefused    = 10
	ExitDependencyMissing     = 11
	ExitPartialFailure        = 12
	defaultAPIURL             = "http://127.0.0.1:8080"
	defaultConfigRelativePath = ".config/natrocos/config.toml"
)

type Options struct {
	Commit     string
	Date       string
	HTTPClient *http.Client
	Stderr     io.Writer
	Stdout     io.Writer
	Version    string
}

type globals struct {
	APIURL  string
	Config  string
	Help    bool
	JSON    bool
	Profile string
	Quiet   bool
	Timeout time.Duration
	Verbose bool
}

type apiClient struct {
	baseURL    string
	httpClient *http.Client
}

type apiError struct {
	statusCode int
	message    string
}

type doctorCheck struct {
	Name   string `json:"name"`
	OK     bool   `json:"ok"`
	Detail string `json:"detail"`
}

type apiRequestOptions struct {
	Body string
}

func Execute(ctx context.Context, args []string, options Options) int {
	runner := newRunner(options)
	return runner.execute(ctx, args)
}

type runner struct {
	commit     string
	date       string
	httpClient *http.Client
	stderr     io.Writer
	stdout     io.Writer
	version    string
}

func newRunner(options Options) runner {
	if options.Stdout == nil {
		options.Stdout = io.Discard
	}
	if options.Stderr == nil {
		options.Stderr = io.Discard
	}
	if options.HTTPClient == nil {
		options.HTTPClient = http.DefaultClient
	}
	if options.Version == "" {
		options.Version = "dev"
	}
	if options.Commit == "" {
		options.Commit = "none"
	}
	if options.Date == "" {
		options.Date = "unknown"
	}

	return runner{
		commit:     options.Commit,
		date:       options.Date,
		httpClient: options.HTTPClient,
		stderr:     options.Stderr,
		stdout:     options.Stdout,
		version:    options.Version,
	}
}

func (r runner) execute(ctx context.Context, args []string) int {
	global, commandArgs, err := parseGlobals(args)
	if err != nil {
		r.errorf("%v\n", err)
		return ExitInvalidUsage
	}

	if global.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, global.Timeout)
		defer cancel()
	}

	if global.Help {
		r.printHelp(commandArgs)
		return ExitSuccess
	}

	if len(commandArgs) == 0 {
		r.printRootHelp()
		return ExitSuccess
	}

	client := apiClient{
		baseURL:    normalizeAPIURL(global.APIURL),
		httpClient: r.httpClient,
	}

	switch commandArgs[0] {
	case "version":
		return r.runVersion(global)
	case "completion":
		return r.runCompletion(commandArgs[1:])
	case "config":
		return r.runConfig(global, commandArgs[1:])
	case "qrcode":
		return r.notImplemented("qrcode is planned but not implemented yet")
	case "status":
		return r.runStatus(ctx, global, client)
	case "doctor":
		return r.runDoctor(ctx, global, client)
	case "health":
		return r.runHealth(ctx, global, client, commandArgs[1:])
	case "setup":
		return r.runSetup(ctx, global, client, commandArgs[1:])
	case "app":
		return r.runApp(ctx, global, client, commandArgs[1:])
	case "store":
		return r.runStore(ctx, global, client, commandArgs[1:])
	case "storage":
		return r.runStorage(ctx, global, client, commandArgs[1:])
	case "api":
		return r.runAPI(ctx, global, client, commandArgs[1:])
	default:
		r.errorf("unknown command %q\n", commandArgs[0])
		return ExitInvalidUsage
	}
}

func (r runner) runVersion(global globals) int {
	payload := map[string]string{
		"commit":  r.commit,
		"date":    r.date,
		"version": r.version,
	}
	if global.JSON {
		return r.writeJSON(payload)
	}

	r.printf("NatrocOS CLI %s\ncommit: %s\nbuilt: %s\n", r.version, r.commit, r.date)
	return ExitSuccess
}

func (r runner) runCompletion(args []string) int {
	if len(args) != 1 {
		r.errorf("usage: natrocos completion <bash|zsh|fish|powershell>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "bash", "zsh", "fish", "powershell":
		r.printf("# %s completion is planned for a future CLI milestone.\n", args[0])
		return ExitSuccess
	default:
		r.errorf("unsupported shell %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runConfig(global globals, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos config <path|show|set|unset>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "path":
		r.printf("%s\n", global.Config)
		return ExitSuccess
	case "show":
		payload := map[string]string{
			"apiUrl":  normalizeAPIURL(global.APIURL),
			"path":    global.Config,
			"profile": global.Profile,
		}
		if global.JSON {
			return r.writeJSON(payload)
		}
		r.printf("profile: %s\napi-url: %s\nconfig: %s\n", payload["profile"], payload["apiUrl"], payload["path"])
		return ExitSuccess
	case "set", "unset":
		return r.notImplemented("config persistence is planned but not implemented yet")
	default:
		r.errorf("unknown config command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runStatus(ctx context.Context, global globals, client apiClient) int {
	var summary natrocos.SystemSummary
	if exit := r.getJSON(ctx, client, natrocos.RouteSystem, &summary); exit != ExitSuccess {
		return exit
	}

	if global.JSON {
		return r.writeJSON(summary)
	}

	r.printf("Node: %s\n", summary.NodeName)
	r.printf("Uptime: %s\n", summary.Uptime)
	r.printf("Data root: %s\n", summary.DataRoot)
	r.printf("Apps: %d\n", len(summary.Apps))
	r.printf("Storage pools: %d\n", len(summary.StoragePools))
	for _, metric := range summary.Metrics {
		r.printf("- %s: %s\n", metric.Key, metric.Value)
	}

	return ExitSuccess
}

func (r runner) runDoctor(ctx context.Context, global globals, client apiClient) int {
	checks := []doctorCheck{
		r.checkEndpoint(ctx, client, "gateway health", natrocos.RouteHealth),
		r.checkEndpoint(ctx, client, "system summary", natrocos.RouteSystem),
		r.checkEndpoint(ctx, client, "apps api", natrocos.RouteApps),
		r.checkEndpoint(ctx, client, "storage pools api", natrocos.RouteStoragePools),
	}

	if global.JSON {
		return r.writeJSON(checks)
	}

	hasFailure := false
	for _, check := range checks {
		status := "OK"
		if !check.OK {
			status = "FAIL"
			hasFailure = true
		}
		r.printf("[%s] %s - %s\n", status, check.Name, check.Detail)
	}

	if hasFailure {
		return ExitPartialFailure
	}
	return ExitSuccess
}

func (r runner) runHealth(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos health <services|ports|logs>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "services":
		var health natrocos.HealthResponse
		if exit := r.getJSON(ctx, client, natrocos.RouteHealth, &health); exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(health)
		}
		r.printf("%s: %s\n", health.Service, health.Status)
		return ExitSuccess
	case "ports", "logs":
		return r.notImplemented("health " + args[0] + " is planned but not implemented yet")
	default:
		r.errorf("unknown health command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runSetup(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos setup <status|owner>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "status":
		var status natrocos.SetupStatus
		if exit := r.getJSON(ctx, client, natrocos.RouteSetupStatus, &status); exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(status)
		}
		r.printf("has owner: %t\nrequires setup: %t\n", status.HasOwner, status.RequiresSetup)
		return ExitSuccess
	case "owner":
		return r.notImplemented("setup owner is planned after auth backend is implemented")
	default:
		r.errorf("unknown setup command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runApp(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos app <list|show|start|stop|restart|open|logs|install|apply|update|uninstall|export|import|env>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "list":
		apps, exit := r.fetchApps(ctx, client)
		if exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(apps)
		}
		for _, app := range apps {
			r.printf("%-14s %-9s cpu=%5.1f%% memory=%s image=%s\n", app.ID, app.Status, app.CPU, app.Memory, app.Image)
		}
		return ExitSuccess
	case "show":
		if len(args) < 2 {
			r.errorf("usage: natrocos app show <app-id>\n")
			return ExitInvalidUsage
		}
		app, exit := r.findApp(ctx, client, args[1])
		if exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(app)
		}
		r.printf("id: %s\nname: %s\nstatus: %s\nimage: %s\nports: %s\ncpu: %.1f%%\nmemory: %s\n",
			app.ID, app.Name, app.Status, app.Image, strings.Join(app.Ports, ", "), app.CPU, app.Memory)
		return ExitSuccess
	case "start", "stop", "restart", "open":
		if len(args) < 2 {
			r.errorf("usage: natrocos app %s <app-id>\n", args[0])
			return ExitInvalidUsage
		}
		return r.runAppAction(ctx, global, client, args[1], args[0])
	case "logs", "install", "apply", "update", "uninstall", "export", "import", "env":
		return r.notImplemented("app " + args[0] + " is planned but not implemented yet")
	default:
		r.errorf("unknown app command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runStore(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos store <list|show|install|repo>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "list":
		storeApps, exit := r.fetchStoreApps(ctx, client)
		if exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(storeApps)
		}
		for _, app := range storeApps {
			recommended := ""
			if app.Recommended {
				recommended = "recommended"
			}
			r.printf("%-12s %-12s image=%s tags=%s\n", app.ID, recommended, app.Image, strings.Join(app.Tags, ","))
		}
		return ExitSuccess
	case "show":
		if len(args) < 2 {
			r.errorf("usage: natrocos store show <store-app-id>\n")
			return ExitInvalidUsage
		}
		storeApp, exit := r.findStoreApp(ctx, client, args[1])
		if exit != ExitSuccess {
			return exit
		}
		if global.JSON {
			return r.writeJSON(storeApp)
		}
		r.printf("id: %s\nname: %s\nimage: %s\nrecommended: %t\ntags: %s\n",
			storeApp.ID, storeApp.Name, storeApp.Image, storeApp.Recommended, strings.Join(storeApp.Tags, ", "))
		return ExitSuccess
	case "install":
		if len(args) < 2 {
			r.errorf("usage: natrocos store install <store-app-id> [--dry-run]\n")
			return ExitInvalidUsage
		}
		if hasLocalFlag(args[2:], "--dry-run") {
			return r.runStoreInstallDryRun(ctx, global, client, args[1])
		}
		return r.runStoreInstall(ctx, global, client, args[1])
	case "repo":
		return r.notImplemented("store repo is planned but not implemented yet")
	default:
		r.errorf("unknown store command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runStorage(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) == 0 {
		r.errorf("usage: natrocos storage <summary|pool|disk|mount|share>\n")
		return ExitInvalidUsage
	}

	switch args[0] {
	case "summary":
		return r.runStoragePools(ctx, global, client, true)
	case "pool":
		if len(args) >= 2 && args[1] == "list" {
			return r.runStoragePools(ctx, global, client, false)
		}
		return r.notImplemented("storage pool mutation is planned but not implemented yet")
	case "disk", "mount", "share":
		return r.notImplemented("storage " + args[0] + " is planned but not implemented yet")
	default:
		r.errorf("unknown storage command %q\n", args[0])
		return ExitInvalidUsage
	}
}

func (r runner) runAPI(ctx context.Context, global globals, client apiClient, args []string) int {
	if len(args) < 2 {
		r.errorf("usage: natrocos api <get|post> <path> [--body json]\n")
		return ExitInvalidUsage
	}

	method := strings.ToUpper(args[0])
	if method != http.MethodGet && method != http.MethodPost {
		r.errorf("unsupported api method %q\n", args[0])
		return ExitInvalidUsage
	}

	apiArgs, requestOptions, err := parseAPIRequestOptions(args[2:])
	if err != nil {
		r.errorf("%v\n", err)
		return ExitInvalidUsage
	}
	if len(apiArgs) != 0 {
		r.errorf("unexpected api arguments: %s\n", strings.Join(apiArgs, " "))
		return ExitInvalidUsage
	}

	var payload json.RawMessage
	exit := r.doRaw(ctx, client, method, args[1], requestOptions.Body, &payload)
	if exit != ExitSuccess {
		return exit
	}

	if len(payload) == 0 {
		r.printf("\n")
		return ExitSuccess
	}

	var pretty bytes.Buffer
	if err := json.Indent(&pretty, payload, "", "  "); err != nil {
		r.printf("%s\n", string(payload))
		return ExitSuccess
	}
	r.printf("%s\n", pretty.String())
	return ExitSuccess
}

func (r runner) runAppAction(ctx context.Context, global globals, client apiClient, appID string, action string) int {
	path := fmt.Sprintf("/api/apps/%s/%s", appID, action)
	body, err := json.Marshal(natrocos.AppActionRequest{Action: action})
	if err != nil {
		r.errorf("%v\n", err)
		return ExitGenericError
	}

	var response natrocos.AppActionResponse
	if exit := r.postJSON(ctx, client, path, string(body), &response); exit != ExitSuccess {
		return exit
	}

	if global.JSON {
		return r.writeJSON(response)
	}
	r.printf("%s: %s\n", response.App.ID, response.App.Status)
	return ExitSuccess
}

func (r runner) runStoreInstall(ctx context.Context, global globals, client apiClient, appID string) int {
	body, err := json.Marshal(natrocos.StoreInstallRequest{AppID: appID})
	if err != nil {
		r.errorf("%v\n", err)
		return ExitGenericError
	}

	var response natrocos.StoreInstallResponse
	if exit := r.postJSON(ctx, client, fmt.Sprintf("/api/store/%s/install", appID), string(body), &response); exit != ExitSuccess {
		return exit
	}

	if global.JSON {
		return r.writeJSON(response)
	}
	r.printf("%s: %s\n", response.AppID, response.Status)
	return ExitSuccess
}

func (r runner) runStoreInstallDryRun(ctx context.Context, global globals, client apiClient, appID string) int {
	storeApp, exit := r.findStoreApp(ctx, client, appID)
	if exit != ExitSuccess {
		return exit
	}

	plan := map[string]any{
		"appId":       storeApp.ID,
		"image":       storeApp.Image,
		"recommended": storeApp.Recommended,
		"status":      "dry-run",
	}
	if global.JSON {
		return r.writeJSON(plan)
	}
	r.printf("Dry run install plan\napp: %s\nimage: %s\nstatus: no changes applied\n", storeApp.ID, storeApp.Image)
	return ExitSuccess
}

func (r runner) runStoragePools(ctx context.Context, global globals, client apiClient, summary bool) int {
	var pools []natrocos.StoragePool
	if exit := r.getJSON(ctx, client, natrocos.RouteStoragePools, &pools); exit != ExitSuccess {
		return exit
	}

	if global.JSON {
		return r.writeJSON(pools)
	}

	if summary {
		r.printf("Data root: %s\nStorage pools: %d\n", natrocos.DataRoot, len(pools))
	}
	for _, pool := range pools {
		r.printf("%-12s %-28s used=%s total=%s\n", pool.ID, pool.MountPath, pool.Used, pool.Total)
	}
	return ExitSuccess
}

func (r runner) fetchApps(ctx context.Context, client apiClient) ([]natrocos.AppInstance, int) {
	var apps []natrocos.AppInstance
	if exit := r.getJSON(ctx, client, natrocos.RouteApps, &apps); exit != ExitSuccess {
		return nil, exit
	}
	return apps, ExitSuccess
}

func (r runner) findApp(ctx context.Context, client apiClient, appID string) (natrocos.AppInstance, int) {
	apps, exit := r.fetchApps(ctx, client)
	if exit != ExitSuccess {
		return natrocos.AppInstance{}, exit
	}
	for _, app := range apps {
		if app.ID == appID {
			return app, ExitSuccess
		}
	}
	r.errorf("app %q not found\n", appID)
	return natrocos.AppInstance{}, ExitNotFound
}

func (r runner) fetchStoreApps(ctx context.Context, client apiClient) ([]natrocos.StoreApp, int) {
	var storeApps []natrocos.StoreApp
	if exit := r.getJSON(ctx, client, natrocos.RouteStore, &storeApps); exit != ExitSuccess {
		return nil, exit
	}
	return storeApps, ExitSuccess
}

func (r runner) findStoreApp(ctx context.Context, client apiClient, appID string) (natrocos.StoreApp, int) {
	storeApps, exit := r.fetchStoreApps(ctx, client)
	if exit != ExitSuccess {
		return natrocos.StoreApp{}, exit
	}
	for _, app := range storeApps {
		if app.ID == appID {
			return app, ExitSuccess
		}
	}
	r.errorf("store app %q not found\n", appID)
	return natrocos.StoreApp{}, ExitNotFound
}

func (r runner) getJSON(ctx context.Context, client apiClient, path string, out any) int {
	return r.doJSON(ctx, client, http.MethodGet, path, "", out)
}

func (r runner) postJSON(ctx context.Context, client apiClient, path string, body string, out any) int {
	return r.doJSON(ctx, client, http.MethodPost, path, body, out)
}

func (r runner) doJSON(ctx context.Context, client apiClient, method string, path string, body string, out any) int {
	var payload json.RawMessage
	if exit := r.doRaw(ctx, client, method, path, body, &payload); exit != ExitSuccess {
		return exit
	}

	if len(payload) == 0 {
		return ExitSuccess
	}
	if err := json.Unmarshal(payload, out); err != nil {
		r.errorf("invalid API response: %v\n", err)
		return ExitGenericError
	}
	return ExitSuccess
}

func (r runner) doRaw(ctx context.Context, client apiClient, method string, path string, body string, out *json.RawMessage) int {
	requestURL := client.baseURL + ensureLeadingSlash(path)
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}

	request, err := http.NewRequestWithContext(ctx, method, requestURL, reader)
	if err != nil {
		r.errorf("%v\n", err)
		return ExitInvalidUsage
	}
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			r.errorf("request timed out\n")
			return ExitTimedOut
		}
		r.errorf("API unavailable: %v\n", err)
		return ExitAPIUnavailable
	}
	defer response.Body.Close()

	payload, err := io.ReadAll(response.Body)
	if err != nil {
		r.errorf("read API response: %v\n", err)
		return ExitGenericError
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		r.errorf("API request failed: %s - %s\n", response.Status, strings.TrimSpace(string(payload)))
		return exitCodeForHTTPStatus(response.StatusCode)
	}

	*out = payload
	return ExitSuccess
}

func (r runner) checkEndpoint(ctx context.Context, client apiClient, name string, path string) doctorCheck {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, client.baseURL+path, nil)
	if err != nil {
		return doctorCheck{Name: name, OK: false, Detail: err.Error()}
	}

	response, err := client.httpClient.Do(request)
	if err != nil {
		return doctorCheck{Name: name, OK: false, Detail: err.Error()}
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return doctorCheck{Name: name, OK: false, Detail: response.Status}
	}

	return doctorCheck{Name: name, OK: true, Detail: response.Status}
}

func (r runner) printHelp(args []string) {
	path := strings.Join(args, " ")
	switch path {
	case "", "help":
		r.printRootHelp()
	case "app":
		r.printf(appHelp)
	case "store":
		r.printf(storeHelp)
	case "storage":
		r.printf(storageHelp)
	case "health":
		r.printf(healthHelp)
	default:
		r.printf("Usage: natrocos %s\n\nRun `natrocos --help` for the full command tree.\n", path)
	}
}

func (r runner) printRootHelp() {
	r.printf(rootHelp)
}

func (r runner) notImplemented(message string) int {
	r.errorf("%s\n", message)
	return ExitGenericError
}

func (r runner) writeJSON(payload any) int {
	encoder := json.NewEncoder(r.stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(payload); err != nil {
		r.errorf("%v\n", err)
		return ExitGenericError
	}
	return ExitSuccess
}

func (r runner) printf(format string, values ...any) {
	fmt.Fprintf(r.stdout, format, values...)
}

func (r runner) errorf(format string, values ...any) {
	fmt.Fprintf(r.stderr, format, values...)
}

func parseGlobals(args []string) (globals, []string, error) {
	global := globals{
		APIURL:  firstNonEmpty(os.Getenv("NATROCOS_API_URL"), defaultAPIURL),
		Config:  firstNonEmpty(os.Getenv("NATROCOS_CONFIG"), defaultConfigPath()),
		Profile: firstNonEmpty(os.Getenv("NATROCOS_PROFILE"), "default"),
	}

	commandArgs := make([]string, 0, len(args))
	for index := 0; index < len(args); index++ {
		arg := args[index]
		switch {
		case arg == "--":
			commandArgs = append(commandArgs, args[index+1:]...)
			return global, commandArgs, nil
		case arg == "-h" || arg == "--help":
			global.Help = true
		case arg == "--json":
			global.JSON = true
		case arg == "--quiet":
			global.Quiet = true
		case arg == "--verbose":
			global.Verbose = true
		case arg == "--no-color":
		case arg == "-u" || arg == "--api-url" || arg == "--config" || arg == "--profile" || arg == "--timeout":
			if index+1 >= len(args) {
				return global, nil, fmt.Errorf("%s requires a value", arg)
			}
			index++
			if err := applyGlobalValue(&global, arg, args[index]); err != nil {
				return global, nil, err
			}
		case strings.HasPrefix(arg, "--api-url="):
			if err := applyGlobalValue(&global, "--api-url", strings.TrimPrefix(arg, "--api-url=")); err != nil {
				return global, nil, err
			}
		case strings.HasPrefix(arg, "--config="):
			if err := applyGlobalValue(&global, "--config", strings.TrimPrefix(arg, "--config=")); err != nil {
				return global, nil, err
			}
		case strings.HasPrefix(arg, "--profile="):
			if err := applyGlobalValue(&global, "--profile", strings.TrimPrefix(arg, "--profile=")); err != nil {
				return global, nil, err
			}
		case strings.HasPrefix(arg, "--timeout="):
			if err := applyGlobalValue(&global, "--timeout", strings.TrimPrefix(arg, "--timeout=")); err != nil {
				return global, nil, err
			}
		default:
			commandArgs = append(commandArgs, arg)
		}
	}

	return global, commandArgs, nil
}

func applyGlobalValue(global *globals, flag string, value string) error {
	switch flag {
	case "-u", "--api-url":
		global.APIURL = value
	case "--config":
		global.Config = value
	case "--profile":
		global.Profile = value
	case "--timeout":
		duration, err := time.ParseDuration(value)
		if err != nil {
			return fmt.Errorf("invalid timeout %q", value)
		}
		global.Timeout = duration
	default:
		return fmt.Errorf("unknown global flag %q", flag)
	}
	return nil
}

func parseAPIRequestOptions(args []string) ([]string, apiRequestOptions, error) {
	options := apiRequestOptions{}
	remaining := make([]string, 0, len(args))

	for index := 0; index < len(args); index++ {
		arg := args[index]
		switch {
		case arg == "--body":
			if index+1 >= len(args) {
				return nil, options, fmt.Errorf("--body requires a value")
			}
			index++
			options.Body = args[index]
		case strings.HasPrefix(arg, "--body="):
			options.Body = strings.TrimPrefix(arg, "--body=")
		default:
			remaining = append(remaining, arg)
		}
	}

	return remaining, options, nil
}

func hasLocalFlag(args []string, flag string) bool {
	for _, arg := range args {
		if arg == flag {
			return true
		}
	}
	return false
}

func normalizeAPIURL(value string) string {
	value = strings.TrimRight(value, "/")
	if value == "" {
		value = defaultAPIURL
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	return "http://" + value
}

func ensureLeadingSlash(path string) string {
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}

func defaultConfigPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return defaultConfigRelativePath
	}
	return filepath.Join(home, defaultConfigRelativePath)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func exitCodeForHTTPStatus(statusCode int) int {
	switch statusCode {
	case http.StatusUnauthorized:
		return ExitAuthentication
	case http.StatusForbidden:
		return ExitPermissionDenied
	case http.StatusNotFound:
		return ExitNotFound
	case http.StatusConflict:
		return ExitConflict
	case http.StatusBadRequest, http.StatusUnprocessableEntity:
		return ExitValidationFailed
	default:
		return ExitAPIUnavailable
	}
}

const rootHelp = `NatrocOS local administration CLI

Usage:
  natrocos [global flags] <command>

Global flags:
  -u, --api-url <url>      Gateway API URL, default http://127.0.0.1:8080
      --config <path>      CLI config path
      --profile <name>     CLI connection profile
      --json               Output JSON where supported
      --quiet              Reduce output
      --verbose            Increase diagnostic output
      --no-color           Disable terminal color
      --timeout <duration> Request timeout, for example 10s

Commands:
  version                  Show CLI version
  completion <shell>       Generate shell completion placeholder
  config <command>         Inspect CLI config
  status                   Show gateway system summary
  doctor                   Run read-only API diagnostics
  health services          Check gateway health endpoint
  setup status             Show first-owner setup status
  app list                 List managed apps
  app show <app-id>        Show one managed app
  app start <app-id>       Start an app through gateway
  app stop <app-id>        Stop an app through gateway
  app restart <app-id>     Restart an app through gateway
  store list               List catalog apps
  store show <app-id>      Show one catalog app
  store install <app-id>   Queue catalog app install
  storage summary          Show storage pool summary
  storage pool list        List storage pools
  api get <path>           Debug API GET
  api post <path>          Debug API POST

Run "natrocos <command> --help" for command help.
`

const appHelp = `Usage:
  natrocos app list [--json]
  natrocos app show <app-id> [--json]
  natrocos app start <app-id>
  natrocos app stop <app-id>
  natrocos app restart <app-id>
  natrocos app open <app-id>

Planned:
  natrocos app logs/install/apply/update/uninstall/export/import/env
`

const storeHelp = `Usage:
  natrocos store list [--json]
  natrocos store show <store-app-id> [--json]
  natrocos store install <store-app-id> [--dry-run] [--json]

Planned:
  natrocos store repo list/add/remove/sync
`

const storageHelp = `Usage:
  natrocos storage summary [--json]
  natrocos storage pool list [--json]

Planned:
  natrocos storage disk/mount/share mutation commands with --dry-run and --yes
`

const healthHelp = `Usage:
  natrocos health services [--json]

Planned:
  natrocos health ports
  natrocos health logs
`
