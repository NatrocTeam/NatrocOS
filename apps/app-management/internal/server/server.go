package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"natrocos/internal/natrocos"
)

const (
	appDirectoryPermission    = 0o750
	appMetadataFilePermission = 0o600
	composeFilePermission     = 0o600
	serviceName               = "natrocos-app-management"
)

type Options struct {
	DataRoot string
	Runner   CommandRunner
}

type Processor struct {
	dataRoot string
	runner   CommandRunner
}

type CommandRunner interface {
	Run(name string, args ...string) ([]byte, error)
}

type execRunner struct{}

func New(options Options) http.Handler {
	processor := NewProcessor(options)

	mux := http.NewServeMux()
	mux.HandleFunc(natrocos.RouteHealth, handleHealth(processor))
	mux.HandleFunc(natrocos.RouteAppManagementInstallQueue, handleInstallQueue(processor))
	mux.HandleFunc(natrocos.RouteAppManagementProcessQueue, handleProcessInstallQueue(processor))
	mux.HandleFunc(natrocos.RouteAppManagementDeployJob, handleDeployInstallJob(processor))
	return mux
}

func NewProcessor(options Options) Processor {
	dataRoot := strings.TrimSpace(options.DataRoot)
	if dataRoot == "" {
		dataRoot = natrocos.DataRoot
	}
	if options.Runner == nil {
		options.Runner = execRunner{}
	}

	return Processor{dataRoot: dataRoot, runner: options.Runner}
}

func (execRunner) Run(name string, args ...string) ([]byte, error) {
	return exec.Command(name, args...).CombinedOutput()
}

func (p Processor) Health() natrocos.HealthResponse {
	return natrocos.HealthResponse{
		Service:  serviceName,
		Status:   "ok",
		DataRoot: p.dataRoot,
	}
}

func (p Processor) ListInstallQueue() ([]natrocos.StoreInstallJob, error) {
	entries, err := os.ReadDir(p.installQueueDir())
	if err != nil {
		if os.IsNotExist(err) {
			return []natrocos.StoreInstallJob{}, nil
		}
		return nil, err
	}

	jobs := make([]natrocos.StoreInstallJob, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		job, err := p.readJob(filepath.Join(p.installQueueDir(), entry.Name()))
		if err != nil {
			return nil, err
		}
		if strings.TrimSpace(job.JobID) == "" {
			job.JobID = strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		}
		jobs = append(jobs, job)
	}

	sort.Slice(jobs, func(left int, right int) bool {
		if jobs[left].QueuedAt == jobs[right].QueuedAt {
			return jobs[left].JobID < jobs[right].JobID
		}
		return jobs[left].QueuedAt < jobs[right].QueuedAt
	})

	return jobs, nil
}

func (p Processor) ProcessInstallQueue() (natrocos.StoreInstallQueueProcessResponse, error) {
	jobs, err := p.ListInstallQueue()
	if err != nil {
		return natrocos.StoreInstallQueueProcessResponse{}, err
	}

	response := natrocos.StoreInstallQueueProcessResponse{
		Jobs: []natrocos.StoreInstallJob{},
	}

	for _, job := range jobs {
		if job.Status != natrocos.StoreInstallJobQueued {
			continue
		}

		processedJob := p.processJob(job)
		response.Processed++
		switch processedJob.Status {
		case natrocos.StoreInstallJobReady:
			response.Ready++
		case natrocos.StoreInstallJobFailed:
			response.Failed++
		}
		response.Jobs = append(response.Jobs, processedJob)
	}

	return response, nil
}

func (p Processor) DeployInstallJob(jobID string, request natrocos.StoreInstallDeployRequest) (natrocos.StoreInstallDeployResponse, error) {
	jobID, err := cleanJobID(jobID)
	if err != nil {
		return natrocos.StoreInstallDeployResponse{}, err
	}
	if !request.DryRun && !request.Confirm {
		return natrocos.StoreInstallDeployResponse{}, errValidation("deploy requires confirm=true or dryRun=true")
	}

	job, err := p.readJob(filepath.Join(p.installQueueDir(), jobID+".json"))
	if err != nil {
		if os.IsNotExist(err) {
			return natrocos.StoreInstallDeployResponse{}, errNotFound("install job not found")
		}
		return natrocos.StoreInstallDeployResponse{}, err
	}
	job.JobID = jobID

	if job.Status == natrocos.StoreInstallJobQueued {
		job = p.processJob(job)
	}
	if job.Status != natrocos.StoreInstallJobReady && job.Status != natrocos.StoreInstallJobDeployed {
		return natrocos.StoreInstallDeployResponse{}, errValidation("install job must be ready before deploy")
	}

	job, err = p.normalizeJob(job)
	if err != nil {
		return natrocos.StoreInstallDeployResponse{}, err
	}
	if _, err := os.Stat(job.Plan.ComposePath); err != nil {
		if os.IsNotExist(err) {
			job = p.processJob(job)
		} else {
			return natrocos.StoreInstallDeployResponse{}, err
		}
	}
	if job.Status != natrocos.StoreInstallJobReady && job.Status != natrocos.StoreInstallJobDeployed {
		return natrocos.StoreInstallDeployResponse{}, errValidation("install job compose artifact is not ready")
	}

	command := dockerComposeCommand(job.Plan.ComposePath, request.Pull)
	response := natrocos.StoreInstallDeployResponse{
		Job:     job,
		DryRun:  request.DryRun,
		Command: append([]string{"docker"}, command...),
	}
	if request.DryRun {
		return response, nil
	}

	output, runErr := p.runner.Run("docker", command...)
	response.Output = strings.TrimSpace(string(output))
	now := time.Now().UTC().Format(time.RFC3339)
	job.CompletedAt = now
	if runErr != nil {
		job.Status = natrocos.StoreInstallJobFailed
		job.Error = strings.TrimSpace(firstNonEmpty(string(output), runErr.Error()))
		if writeErr := p.writeJob(job); writeErr != nil {
			log.Printf("write failed deploy job %s: %v", job.JobID, writeErr)
		}
		response.Job = job
		return response, fmt.Errorf("docker compose deploy failed: %w", runErr)
	}

	job.Status = natrocos.StoreInstallJobDeployed
	job.Error = ""
	if err := p.writeAppMetadata(job); err != nil {
		return natrocos.StoreInstallDeployResponse{}, err
	}
	if err := p.writeJob(job); err != nil {
		return natrocos.StoreInstallDeployResponse{}, err
	}
	response.Job = job
	return response, nil
}

func (p Processor) processJob(job natrocos.StoreInstallJob) natrocos.StoreInstallJob {
	now := time.Now().UTC().Format(time.RFC3339)
	job.StartedAt = now

	normalizedJob, err := p.normalizeJob(job)
	if err != nil {
		job.Status = natrocos.StoreInstallJobFailed
		job.Error = err.Error()
		job.CompletedAt = now
		if writeErr := p.writeJob(job); writeErr != nil {
			log.Printf("write failed install job %s: %v", job.JobID, writeErr)
		}
		return job
	}

	if err := p.materializeCompose(normalizedJob); err != nil {
		normalizedJob.Status = natrocos.StoreInstallJobFailed
		normalizedJob.Error = err.Error()
		normalizedJob.CompletedAt = now
		if writeErr := p.writeJob(normalizedJob); writeErr != nil {
			log.Printf("write failed install job %s: %v", normalizedJob.JobID, writeErr)
		}
		return normalizedJob
	}

	normalizedJob.Status = natrocos.StoreInstallJobReady
	normalizedJob.Error = ""
	normalizedJob.CompletedAt = now
	if err := p.writeAppMetadata(normalizedJob); err != nil {
		normalizedJob.Status = natrocos.StoreInstallJobFailed
		normalizedJob.Error = err.Error()
	}
	if err := p.writeJob(normalizedJob); err != nil {
		normalizedJob.Status = natrocos.StoreInstallJobFailed
		normalizedJob.Error = err.Error()
	}

	return normalizedJob
}

func (p Processor) normalizeJob(job natrocos.StoreInstallJob) (natrocos.StoreInstallJob, error) {
	job.JobID = strings.TrimSpace(job.JobID)
	if job.JobID == "" {
		return natrocos.StoreInstallJob{}, errors.New("missing install job id")
	}

	job.App.ID = sanitizeName(firstNonEmpty(job.App.ID, job.Plan.ServiceName))
	if job.App.ID == "" {
		return natrocos.StoreInstallJob{}, errors.New("missing app id")
	}
	job.App.Name = strings.TrimSpace(job.App.Name)
	if job.App.Name == "" {
		job.App.Name = job.App.ID
	}
	job.App.Image = strings.TrimSpace(firstNonEmpty(job.App.Image, job.Plan.Image))
	if job.App.Image == "" {
		return natrocos.StoreInstallJob{}, errors.New("missing app image")
	}

	job.Plan.Image = job.App.Image
	job.Plan.ServiceName = sanitizeName(firstNonEmpty(job.Plan.ServiceName, job.App.ID))
	if job.Plan.ServiceName == "" {
		return natrocos.StoreInstallJob{}, errors.New("missing compose service name")
	}

	appsRoot := filepath.Join(p.dataRoot, "apps")
	dataPath := firstNonEmpty(job.Plan.DataPath, filepath.Join(appsRoot, job.App.ID))
	if !pathInside(appsRoot, dataPath) {
		return natrocos.StoreInstallJob{}, fmt.Errorf("install data path must stay inside %s", appsRoot)
	}

	job.Plan.DataPath = cleanPath(dataPath)
	job.Plan.ComposePath = filepath.Join(job.Plan.DataPath, "compose.yaml")
	job.Plan.Tags = cleanTags(job.Plan.Tags)
	job.StartedAt = firstNonEmpty(job.StartedAt, time.Now().UTC().Format(time.RFC3339))
	return job, nil
}

func (p Processor) materializeCompose(job natrocos.StoreInstallJob) error {
	if err := os.MkdirAll(filepath.Join(job.Plan.DataPath, "data"), appDirectoryPermission); err != nil {
		return err
	}

	compose := renderCompose(job)
	if err := writeFileAtomic(job.Plan.ComposePath, []byte(compose), composeFilePermission); err != nil {
		return err
	}

	return nil
}

func (p Processor) writeAppMetadata(job natrocos.StoreInstallJob) error {
	metadataPath := filepath.Join(job.Plan.DataPath, "metadata.json")
	return writeJSONAtomic(metadataPath, job, appMetadataFilePermission)
}

func renderCompose(job natrocos.StoreInstallJob) string {
	projectName := "natrocos-" + job.Plan.ServiceName
	containerName := "natrocos-" + job.Plan.ServiceName

	return strings.Join([]string{
		"name: " + yamlQuote(projectName),
		"services:",
		"  " + job.Plan.ServiceName + ":",
		"    image: " + yamlQuote(job.Plan.Image),
		"    container_name: " + yamlQuote(containerName),
		"    restart: unless-stopped",
		"    volumes:",
		"      - './data:/data'",
		"",
	}, "\n")
}

func (p Processor) readJob(path string) (natrocos.StoreInstallJob, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return natrocos.StoreInstallJob{}, err
	}

	var job natrocos.StoreInstallJob
	if err := json.Unmarshal(content, &job); err != nil {
		return natrocos.StoreInstallJob{}, err
	}
	return job, nil
}

func (p Processor) writeJob(job natrocos.StoreInstallJob) error {
	path := filepath.Join(p.installQueueDir(), job.JobID+".json")
	return writeJSONAtomic(path, job, natrocos.AppInstallQueueFilePermission)
}

func dockerComposeCommand(composePath string, pull bool) []string {
	command := []string{"compose", "-f", composePath, "up", "-d"}
	if pull {
		command = append(command, "--pull", "always")
	}
	return command
}

func (p Processor) installQueueDir() string {
	return filepath.Join(p.dataRoot, filepath.FromSlash(natrocos.AppInstallQueueRelativePath))
}

func handleHealth(processor Processor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		writeJSON(w, http.StatusOK, processor.Health())
	}
}

func handleInstallQueue(processor Processor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		jobs, err := processor.ListInstallQueue()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, jobs)
	}
}

func handleProcessInstallQueue(processor Processor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload, err := processor.ProcessInstallQueue()
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusAccepted, payload)
	}
}

func handleDeployInstallJob(processor Processor) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		request := natrocos.StoreInstallDeployRequest{DryRun: true}
		if r.Body != nil {
			defer r.Body.Close()
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil && !errors.Is(err, io.EOF) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json request"})
				return
			}
		}

		payload, err := processor.DeployInstallJob(r.PathValue("id"), request)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusAccepted, payload)
	}
}

func allowMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method == method {
		return true
	}

	w.Header().Set("Allow", method)
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return false
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.As(err, new(notFoundError)):
		status = http.StatusNotFound
	case errors.As(err, new(validationError)):
		status = http.StatusUnprocessableEntity
	}

	writeJSON(w, status, map[string]string{
		"error": err.Error(),
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json response: %v", err)
	}
}

func writeJSONAtomic(path string, payload any, permission os.FileMode) error {
	content, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(path, content, permission)
}

func writeFileAtomic(path string, content []byte, permission os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), appDirectoryPermission); err != nil {
		return err
	}

	tempPath := path + ".tmp"
	if err := os.WriteFile(tempPath, content, permission); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

func sanitizeName(value string) string {
	var builder strings.Builder
	lastDash := false
	for _, char := range strings.ToLower(strings.TrimSpace(value)) {
		switch {
		case char >= 'a' && char <= 'z', char >= '0' && char <= '9':
			builder.WriteRune(char)
			lastDash = false
		case !lastDash:
			builder.WriteByte('-')
			lastDash = true
		}
	}

	name := strings.Trim(builder.String(), "-")
	if name == "" {
		return ""
	}
	if name[0] >= '0' && name[0] <= '9' {
		return "app-" + name
	}
	return name
}

func cleanJobID(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errValidation("missing install job id")
	}
	if strings.ContainsAny(value, `/\`) || value == "." || value == ".." || strings.Contains(value, "..") {
		return "", errValidation("invalid install job id")
	}
	return value, nil
}

func pathInside(base string, target string) bool {
	base = cleanPath(base)
	target = cleanPath(target)

	relative, err := filepath.Rel(base, target)
	if err != nil {
		return false
	}
	return relative != "." && relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))
}

func cleanPath(path string) string {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return filepath.Clean(path)
	}
	return filepath.Clean(absolute)
}

func cleanTags(tags []string) []string {
	if tags == nil {
		return []string{}
	}

	cleaned := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag != "" {
			cleaned = append(cleaned, tag)
		}
	}
	return cleaned
}

func yamlQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

type notFoundError string

func (err notFoundError) Error() string {
	return string(err)
}

func errNotFound(message string) error {
	return notFoundError(message)
}

type validationError string

func (err validationError) Error() string {
	return string(err)
}

func errValidation(message string) error {
	return validationError(message)
}
