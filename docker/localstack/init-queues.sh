#!/bin/sh
set -e

echo "=============================================="
echo "Initializing LogiSphere LocalStack SQS Queues"
echo "=============================================="

ENDPOINT_URL="http://localhost:4566"
REGION="ap-south-1"

# Helper function to run AWS CLI command against LocalStack
run_aws() {
  if command -v awslocal > /dev/null 2>&1; then
    awslocal "$@"
  else
    aws --endpoint-url="$ENDPOINT_URL" --region="$REGION" "$@"
  fi
}

# 1. Create Dead-Letter Queues (DLQs)
echo "Creating Dead-Letter Queues..."
run_aws sqs create-queue --queue-name logisphere-notification-dlq
run_aws sqs create-queue --queue-name logisphere-tracking-dlq
run_aws sqs create-queue --queue-name logisphere-fleet-dlq

# Retrieve DLQ ARNs
NOTIF_DLQ_ARN=$(run_aws sqs get-queue-attributes --queue-url "$ENDPOINT_URL/000000000000/logisphere-notification-dlq" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
TRACK_DLQ_ARN=$(run_aws sqs get-queue-attributes --queue-url "$ENDPOINT_URL/000000000000/logisphere-tracking-dlq" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)
FLEET_DLQ_ARN=$(run_aws sqs get-queue-attributes --queue-url "$ENDPOINT_URL/000000000000/logisphere-fleet-dlq" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

echo "Notification DLQ ARN: $NOTIF_DLQ_ARN"
echo "Tracking DLQ ARN:     $TRACK_DLQ_ARN"
echo "Fleet DLQ ARN:        $FLEET_DLQ_ARN"

# 2. Create Primary Queues with Redrive Policy (maxReceiveCount = 5)
echo "Creating Primary SQS Queues with Redrive Policies..."

run_aws sqs create-queue \
  --queue-name logisphere-notification-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$NOTIF_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"

run_aws sqs create-queue \
  --queue-name logisphere-tracking-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$TRACK_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"

run_aws sqs create-queue \
  --queue-name logisphere-fleet-queue \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$FLEET_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"

echo "=============================================="
echo "All LogiSphere SQS queues initialized successfully:"
run_aws sqs list-queues
echo "=============================================="
