# ⎈ LogiSphere — Kubernetes & Helm Deployment Runbook
### Target: Production Amazon EKS (ap-south-1 Mumbai)

This directory contains the production-grade Helm deployment configuration for **LogiSphere**. It features a **single reusable chart (`logisphere-service`)** that powers all six backend microservices independently, alongside the AWS Load Balancer Controller, Metrics Server, and a resource-tuned Prometheus/Grafana monitoring stack.

---

## 🏛️ Directory Structure

```text
helm/
├── charts/
│   └── logisphere-service/             # Single reusable chart powering all 6 microservices
│       ├── Chart.yaml                  # Chart metadata (v0.1.0)
│       ├── values.yaml                 # Base defaults (Restricted Pod Security Standard)
│       └── templates/
│           ├── _helpers.tpl            # DNS-safe naming and standard CNCF labels
│           ├── deployment.yaml         # RollingUpdate Deployment (scoped secrets & volume mounts)
│           ├── service.yaml            # ClusterIP Service with named ports
│           ├── serviceaccount.yaml     # ServiceAccount with conditional IRSA annotations
│           ├── ingress.yaml            # AWS Application Load Balancer Ingress (api-gateway only)
│           ├── hpa.yaml                # Modern autoscaling/v2 HorizontalPodAutoscaler
│           └── NOTES.txt               # Contextual post-installation instructions
│
├── values/                             # Six service-specific production values files
│   ├── api-gateway.values.yaml         # Port 5000, public ALB Ingress, no direct DB
│   ├── auth-service.values.yaml        # Port 5001, app_auth schema, mounted RSA private key
│   ├── shipment-service.values.yaml    # Port 5002, shipment schema, SQS IRSA publisher
│   ├── fleet-dispatch-service.values.yaml # Port 5003, fleet schema, SQS IRSA consumer
│   ├── tracking-service.values.yaml    # Port 5004, tracking schema, SQS IRSA consumer
│   └── notification-service.values.yaml# Port 5005, notification schema, SQS IRSA consumer
│
├── platform/                           # Official platform add-ons configuration
│   ├── metrics-server-values.yaml      # Metrics Server v3.12.2 (InternalIP, TLS verified)
│   ├── aws-load-balancer-values.yaml   # AWS Load Balancer Controller v1.11.0 (IRSA bound)
│   └── prometheus-stack-values.yaml    # kube-prometheus-stack v69.8.2 (tuned demo profile)
│
├── jobs/
│   └── prisma-migration-job.yaml       # K8s Job: sequential Neon DDL migrations via DIRECT_URL
│
└── README.md                           # This operational runbook
```

---

## 📋 Prerequisites

Before deploying Helm releases:
1. **Infrastructure Provisioned:** Amazon EKS cluster, VPC, and ECR repositories must be provisioned via Terraform.
2. **Kubeconfig Authenticated:**
   ```bash
   aws eks update-kubeconfig --region ap-south-1 --name logisphere-eks-cluster
   kubectl get nodes
   ```
3. **Retrieve Terraform Outputs:**
   ```bash
   cd terraform
   export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   export VPC_ID=$(terraform output -raw vpc_id)
   export ALB_CONTROLLER_ROLE_ARN=$(terraform output -raw aws_load_balancer_controller_role_arn)
   export SQS_ROLE_ARN=$(terraform output -raw microservices_sqs_role_arn)
   export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com"
   cd ..
   ```

---

## 🔐 Phase 1: Namespaces & Scoped Secret Creation

To ensure strict least privilege, secrets are segmented by purpose. Never commit credentials to version control.

### Step 1.1: Create Namespaces
```bash
kubectl create namespace logisphere
kubectl create namespace monitoring
```

### Step 1.2: Create Migration Secret (Exclusive to Migration Job)
```bash
# DIRECT_URL connects directly to Neon without connection pooling for DDL schema alterations
kubectl create secret generic logisphere-migration-secrets -n logisphere \
  --from-literal=DIRECT_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  --from-literal=ADMIN_INITIAL_PASSWORD="<STRONG_ADMIN_PASSWORD>"
```

### Step 1.3: Create Auth Service Secrets (Exclusive to Auth Service)
```bash
# 1. Database & shared keys
kubectl create secret generic auth-service-secrets -n logisphere \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=app_auth" \
  --from-literal=INTERNAL_SERVICE_KEY="<SECURE_INTERNAL_KEY>"

# 2. RSA Asymmetric Keys (Mounted as files into /app/services/auth-service/secrets)
kubectl create secret generic auth-service-jwt-keys -n logisphere \
  --from-file=jwt-private.key=services/auth-service/secrets/jwt-private.key \
  --from-file=jwt-public.key=shared/keys/jwt-public.key
```

### Step 1.4: Create API Gateway Secrets (Public Verification Key Only)
```bash
kubectl create secret generic api-gateway-secrets -n logisphere \
  --from-literal=JWT_PUBLIC_KEY="$(cat shared/keys/jwt-public.key)"
```

### Step 1.5: Create Backend Microservice Secrets (No Private Keys)
```bash
kubectl create secret generic shipment-service-secrets -n logisphere \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=shipment" \
  --from-literal=INTERNAL_SERVICE_KEY="<SECURE_INTERNAL_KEY>" \
  --from-literal=JWT_PUBLIC_KEY="$(cat shared/keys/jwt-public.key)"

kubectl create secret generic fleet-dispatch-service-secrets -n logisphere \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=fleet" \
  --from-literal=INTERNAL_SERVICE_KEY="<SECURE_INTERNAL_KEY>" \
  --from-literal=JWT_PUBLIC_KEY="$(cat shared/keys/jwt-public.key)"

kubectl create secret generic tracking-service-secrets -n logisphere \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=tracking" \
  --from-literal=INTERNAL_SERVICE_KEY="<SECURE_INTERNAL_KEY>" \
  --from-literal=JWT_PUBLIC_KEY="$(cat shared/keys/jwt-public.key)"

kubectl create secret generic notification-service-secrets -n logisphere \
  --from-literal=DATABASE_URL="postgresql://user:pass@ep-cool-fog-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require&schema=notification" \
  --from-literal=INTERNAL_SERVICE_KEY="<SECURE_INTERNAL_KEY>" \
  --from-literal=JWT_PUBLIC_KEY="$(cat shared/keys/jwt-public.key)"
```

### Step 1.6: Create Grafana Credentials Secret
```bash
kubectl create secret generic grafana-admin-credentials -n monitoring \
  --from-literal=admin-user="admin" \
  --from-literal=admin-password="<STRONG_GRAFANA_PASSWORD>"
```

---

## ⚙️ Phase 2: Deploy Platform Add-ons

Platform components must be installed in strict order before microservices.

### Step 2.1: Deploy Kubernetes Metrics Server (Pinned v3.12.2)
```bash
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update metrics-server

helm upgrade --install metrics-server metrics-server/metrics-server \
  --version 3.12.2 \
  --namespace kube-system \
  -f ./helm/platform/metrics-server-values.yaml
```
*Verify:*
```bash
kubectl rollout status deployment metrics-server -n kube-system
kubectl top nodes
```

### Step 2.2: Deploy AWS Load Balancer Controller (Pinned v1.11.0)
```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --version 1.11.0 \
  --namespace kube-system \
  -f ./helm/platform/aws-load-balancer-values.yaml \
  --set vpcId="${VPC_ID}" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${ALB_CONTROLLER_ROLE_ARN}"
```
*Verify:*
```bash
kubectl rollout status deployment aws-load-balancer-controller -n kube-system
```

### Step 2.3: Deploy Lightweight Monitoring Stack (Pinned v69.8.2)
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update prometheus-community

helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --version 69.8.2 \
  --namespace monitoring \
  -f ./helm/platform/prometheus-stack-values.yaml
```

---

## 🗄️ Phase 3: Execute Prisma Database Migrations

Run database migrations **before** deploying application microservices:

```bash
# 1. Update image in job manifest with your AWS Account ID
sed -i "s/<AWS_ACCOUNT_ID>/${AWS_ACCOUNT_ID}/g" ./helm/jobs/prisma-migration-job.yaml

# 2. Execute migration Job
kubectl apply -f ./helm/jobs/prisma-migration-job.yaml -n logisphere

# 3. Wait for completion (Executes app_auth -> shipment -> fleet -> tracking -> notification)
kubectl wait --for=condition=complete --timeout=180s job/prisma-migration -n logisphere
```
*Verify logs:*
```bash
kubectl logs job/prisma-migration -n logisphere
```

---

## 🚀 Phase 4: Deploy LogiSphere Microservices

All six services deploy using the single reusable chart (`./helm/charts/logisphere-service`):

### Step 4.1: Deploy Backend Microservices (In Dependency Order)
```bash
# 1. Auth Service (Port 5001)
helm upgrade --install auth-service ./helm/charts/logisphere-service \
  -f ./helm/values/auth-service.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-auth-service" \
  -n logisphere

# 2. Notification Service (Port 5005)
helm upgrade --install notification-service ./helm/charts/logisphere-service \
  -f ./helm/values/notification-service.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-notification-service" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${SQS_ROLE_ARN}" \
  -n logisphere

# 3. Shipment Service (Port 5002)
helm upgrade --install shipment-service ./helm/charts/logisphere-service \
  -f ./helm/values/shipment-service.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-shipment-service" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${SQS_ROLE_ARN}" \
  -n logisphere

# 4. Fleet Dispatch Service (Port 5003)
helm upgrade --install fleet-dispatch-service ./helm/charts/logisphere-service \
  -f ./helm/values/fleet-dispatch-service.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-fleet-dispatch-service" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${SQS_ROLE_ARN}" \
  -n logisphere

# 5. Tracking Service (Port 5004)
helm upgrade --install tracking-service ./helm/charts/logisphere-service \
  -f ./helm/values/tracking-service.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-tracking-service" \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="${SQS_ROLE_ARN}" \
  -n logisphere
```

### Step 4.2: Deploy API Gateway & Provision AWS Application Load Balancer
```bash
# Set your validated ACM Certificate ARN (e.g. from AWS Certificate Manager)
ACM_CERT_ARN="<YOUR_ACM_CERTIFICATE_ARN>"

helm upgrade --install api-gateway ./helm/charts/logisphere-service \
  -f ./helm/values/api-gateway.values.yaml \
  --set image.repository="${ECR_REGISTRY}/logisphere-api-gateway" \
  --set ingress.annotations."alb\.ingress\.kubernetes\.io/certificate-arn"="${ACM_CERT_ARN}" \
  -n logisphere
```

---

## 🔍 Phase 5: Verification & Testing

### 1. Verify Pod Status
```bash
kubectl get pods -n logisphere -o wide
```
*Expected: All 6 microservice pods in `Running` state (`1/1` Ready).*

### 2. Retrieve Public ALB Ingress DNS
```bash
kubectl get ingress -n logisphere api-gateway -w
```
*Wait 2–3 minutes for AWS Load Balancer Controller to provision the ALB.*

### 3. Test End-to-End API Gateway Health Check
```bash
export ALB_HOST=$(kubectl get ingress -n logisphere api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl -i http://${ALB_HOST}/health
```
*Expected Output:*
```json
HTTP/1.1 200 OK
{
  "success": true,
  "message": "API Gateway and all microservices are operational",
  "data": {
    "gateway": "UP",
    "downstream": {
      "auth": "UP",
      "shipment": "UP",
      "fleet": "UP",
      "tracking": "UP",
      "notification": "UP"
    }
  }
}
```

### 4. Connect Frontend (Vercel)
Update the `VITE_API_BASE_URL` environment variable in your Vercel project settings:
```text
VITE_API_BASE_URL = "https://<YOUR_CUSTOM_DOMAIN>"  (or "http://${ALB_HOST}")
```

---

## 🧹 Phase 6: Zero-Cost Teardown Runbook

To completely terminate all AWS charges when a demonstration session is finished:

```bash
# 1. Uninstall microservices (Triggers automatic deletion of the AWS ALB)
helm uninstall api-gateway -n logisphere
helm uninstall tracking-service -n logisphere
helm uninstall fleet-dispatch-service -n logisphere
helm uninstall shipment-service -n logisphere
helm uninstall notification-service -n logisphere
helm uninstall auth-service -n logisphere

# 2. Delete migration job
kubectl delete job prisma-migration -n logisphere --ignore-not-found

# 3. Uninstall platform components
helm uninstall prometheus-stack -n monitoring
helm uninstall aws-load-balancer-controller -n kube-system
helm uninstall metrics-server -n kube-system

# 4. Delete namespaces
kubectl delete namespace logisphere monitoring

# 5. Confirm no orphan AWS ALBs remain before running terraform destroy
aws elbv2 describe-load-balancers --region ap-south-1 --query 'LoadBalancers[?contains(LoadBalancerName, `k8s`)].LoadBalancerArn' --output table
```
Once verified, run `terraform destroy` to terminate worker nodes, VPC, and EKS cluster.
