{{/*
Expand the name of the chart.
*/}}
{{- define "logisphere-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
In a reusable microservice chart, we use the Helm Release Name as the primary resource name
(e.g., release "auth-service" produces service and deployment name "auth-service").
*/}}
{{- define "logisphere-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "logisphere-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common CNCF & Kubernetes Recommended Labels
*/}}
{{- define "logisphere-service.labels" -}}
helm.sh/chart: {{ include "logisphere-service.chart" . }}
{{ include "logisphere-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels for Deployment pod matching and Service routing
*/}}
{{- define "logisphere-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "logisphere-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "logisphere-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "logisphere-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
