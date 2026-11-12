# 🏗️ LogiSphere — Amazon EKS & AWS Cloud Infrastructure (Terraform)

This directory contains the production-grade, modular Infrastructure as Code (IaC) configuration for deploying **LogiSphere** on **Amazon Elastic Kubernetes Service (EKS)** in the AWS Mumbai region (`ap-south-1`).

---

## 🏛️ Architecture Overview

The infrastructure provisions an isolated, highly available, and cost-conscious environment across two AWS Availability Zones (`ap-south-1a` and `ap-south-1b`):

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               LogiSphere AWS VPC (10.0.0.0/16)                         │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                        PUBLIC SUBNETS (10.0.1.0/24 & 10.0.2.0/24)              │   │
│   │                                                                                │   │
│   │   [ Internet Gateway ] ──> [ AWS Application Load Balancer (ALB Ingress) ]     │   │
│   │                                        │                                       │   │
│   │   [ Cost-Saving Single NAT Gateway ] ──┘                                       │   │
│   └────────────────────────────────────────┼───────────────────────────────────────┘   │
│                                            │ Internal Routing                          │
│   ┌────────────────────────────────────────▼───────────────────────────────────────┐   │
│   │                       PRIVATE SUBNETS (10.0.10.0/24 & 10.0.20.0/24)            │   │
│   │                                                                                │   │
│   │   Amazon EKS Managed Worker Node Group (2x t3.small Spot Instances)            │   │
│   │   ├── AWS VPC CNI (Direct VPC Pod IPs)                                         │   │
│   │   ├── CoreDNS & Kube-Proxy                                                     │   │
│   │   ├── AWS Load Balancer Controller (IRSA)                                      │   │
│   │   └── LogiSphere Microservice Pods (IRSA to AWS SQS)                           │   │
│   │                                                                                │   │
│   │   Outbound via NAT Gateway ──> Neon PostgreSQL (Singapore) & AWS SQS (Mumbai) │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Modular Directory Structure

```text
terraform/
├── main.tf                  # Master orchestrator connecting all child modules
├── variables.tf             # Configurable parameters (instance types, CIDRs, region)
├── outputs.tf               # Exports cluster endpoint, kubeconfig command, role ARNs
├── versions.tf              # Locks Terraform (>= 1.5.0) and AWS Provider (~> 5.0)
├── terraform.tfvars.example # Documented template for custom overrides
└── modules/
    ├── vpc/                 # Multi-AZ VPC, subnets, IGW, and single NAT Gateway
    ├── security_groups/     # Control plane, worker nodes, and ALB firewall rules
    ├── ecr/                 # 6 private repositories with 7-day auto-purge lifecycle
    ├── iam/                 # Base IAM roles for EKS control plane and worker nodes
    ├── eks/                 # EKS v1.36 control plane, launch template, managed nodes, OIDC provider
    └── irsa/                # OIDC Web Identity roles for ALB Controller & SQS access (logisphere-eks-*)
```

---

## 💰 Cost Analysis & Optimization Strategy (Mumbai `ap-south-1`)

Designed for **on-demand demonstration** sessions to minimize AWS billing while maintaining production standards:

| Component | Configuration | Hourly Cost (Approx.) | 3-Hour Demo Cost |
| :--- | :--- | :--- | :--- |
| **EKS Control Plane** | 1 Managed Cluster | $0.10 / hr | $0.30 |
| **Worker Nodes (2x `t3.small`)** | **EC2 Spot** (~70% discount) | ~$0.0125 / hr total | ~$0.04 |
| **NAT Gateway (Single)** | 1 Gateway + 1 Elastic IP | $0.045 / hr | $0.14 |
| **Application Load Balancer** | 1 Ingress ALB | $0.0225 / hr | $0.07 |
| **Amazon ECR** | 6 Repositories (< 500 MB) | $0.00 (Free Tier) | $0.00 |
| **Amazon SQS** | Standard Queues (< 1M msgs) | $0.00 (Free Tier) | $0.00 |
| **Neon PostgreSQL** | External Cloud DB (Singapore) | $0.00 (Free Tier) | $0.00 |
| **Total Estimated Spend** | — | **~$0.18 / hour** | **~$0.55 per session** |

> **Cost Safeguards Implemented:**
> 1. **Single NAT Gateway:** Saves ~$32/month compared to standard multi-AZ NAT gateways.
> 2. **EC2 Spot Capacity:** Drops compute charges by ~70% compared to On-Demand.
> 3. **ECR Lifecycle Rules:** Automatically prunes untagged images older than 7 days and limits tagged releases to 10.

---

## 🚀 Execution & Deployment Guide

> **Safety Warning:** Never run `terraform apply` without reviewing the plan. Always tear down infrastructure when finished with a demo session.

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 2: Validate & Review Infrastructure Plan
Configure your private `terraform.tfvars` from `terraform.tfvars.example` (ensuring your workstation public IP `/32` is specified in `cluster_endpoint_public_access_cidrs`):
```bash
terraform validate
terraform plan -var-file="terraform.tfvars" -out=tfplan
```

### Step 3: Apply (Provision Cloud Resources)
```bash
terraform apply tfplan
```
*Provisioning takes approximately 10–12 minutes for EKS and the managed node group.*

### Step 4: Configure Local `kubectl`
Once Terraform finishes, run the command displayed in the outputs:
```bash
aws eks update-kubeconfig --region ap-south-1 --name logisphere-eks-cluster
```

Verify your cluster nodes:
```bash
kubectl get nodes -o wide
```

---

## 🧹 Zero-Cost Teardown Guide

When your testing or demonstration session is complete, tear down all resources to bring hourly charges to **$0.00**:

```bash
cd terraform
terraform destroy -auto-approve
```
