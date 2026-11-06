#!/bin/sh
set -e

echo "=============================================="
echo "Initializing LogiSphere LocalStack SQS Queues"
echo "=============================================="

ENDPOINT_URL="http://localhost:4566"
REGION="${AWS_DEFAULT_REGION:-ap-south-1}"

# Helper function to run AWS CLI command against LocalStack
run_aws() {
  if command -v awslocal > /dev/null 2>&1; then
    awslocal "$@"
  else
    aws --endpoint-url="$ENDPOINT_URL" --region="$REGION" "$@"
  fi
}

create_queue_with_dlq() {
  PRIMARY_NAME="$1"
  DLQ_NAME="$2"

  echo "Setting up $PRIMARY_NAME -> $DLQ_NAME"
  run_aws sqs create-queue --queue-name "$DLQ_NAME" > /dev/null 2>&1 || true
  
  DLQ_ARN=$(run_aws sqs get-queue-attributes --queue-url "$ENDPOINT_URL/000000000000/$DLQ_NAME" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
  echo "  DLQ ARN ($DLQ_NAME): $DLQ_ARN"

  run_aws sqs create-queue \
    --queue-name "$PRIMARY_NAME" \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}" > /dev/null 2>&1 || true
  echo "  Primary queue created: $PRIMARY_NAME (maxReceiveCount: 5)"
}

# 1. Environment-prefixed queues (logisphere-local-*)
echo "Creating Local Environment Queues (logisphere-local-*)..."
create_queue_with_dlq "logisphere-local-notification-queue" "logisphere-local-notification-dlq"
create_queue_with_dlq "logisphere-local-tracking-queue" "logisphere-local-tracking-dlq"
create_queue_with_dlq "logisphere-local-fleet-queue" "logisphere-local-fleet-dlq"

# 2. Legacy alias queues (logisphere-*) for backward compatibility
echo "Creating Legacy Compatibility Queues (logisphere-*)..."
create_queue_with_dlq "logisphere-notification-queue" "logisphere-notification-dlq"
create_queue_with_dlq "logisphere-tracking-queue" "logisphere-tracking-dlq"
create_queue_with_dlq "logisphere-fleet-queue" "logisphere-fleet-dlq"

echo "=============================================="
echo "All LogiSphere SQS queues initialized successfully:"
run_aws sqs list-queues
echo "=============================================="
