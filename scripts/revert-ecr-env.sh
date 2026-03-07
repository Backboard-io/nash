#!/usr/bin/env bash
# Retag a known ECR image digest as <env>-latest and trigger App Runner deployment.
#
# Usage:
#   bash scripts/revert-ecr-env.sh dev sha256:7bccfd7be49d09359a4fdd87fea2d1ebb0cd93c85ec0e8cc8a44e1313fc4131d
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: bash scripts/revert-ecr-env.sh <env> <sha256:digest>"
  exit 1
fi

ENV_NAME="$1"
IMAGE_DIGEST="$2"

if [[ ! "$IMAGE_DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  echo "ERROR: digest must look like sha256:<64 hex chars>"
  exit 1
fi

AWS_PROFILE="personal"
AWS_REGION="us-west-2"
APP_NAME="nash"
REPOSITORY_NAME="${APP_NAME}-${ENV_NAME}"
IMAGE_TAG="${ENV_NAME}-latest"
SERVICE_NAME="${APP_NAME}-${ENV_NAME}"

echo "=== Reverting environment ==="
echo "  Env        : ${ENV_NAME}"
echo "  Repository : ${REPOSITORY_NAME}"
echo "  Tag        : ${IMAGE_TAG}"
echo "  Digest     : ${IMAGE_DIGEST}"
echo "  Service    : ${SERVICE_NAME}"
echo ""

echo "1. Fetching image manifest from ECR..."
IMAGE_MANIFEST="$(aws ecr batch-get-image \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --repository-name "${REPOSITORY_NAME}" \
  --image-ids imageDigest="${IMAGE_DIGEST}" \
  --query 'images[0].imageManifest' \
  --output text)"

if [[ -z "${IMAGE_MANIFEST}" || "${IMAGE_MANIFEST}" == "None" ]]; then
  echo "ERROR: digest not found in ${REPOSITORY_NAME}"
  exit 1
fi

echo "2. Retagging ${REPOSITORY_NAME}:${IMAGE_TAG} to ${IMAGE_DIGEST}..."
aws ecr put-image \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --repository-name "${REPOSITORY_NAME}" \
  --image-tag "${IMAGE_TAG}" \
  --image-manifest "${IMAGE_MANIFEST}" \
  >/dev/null

echo "3. Verifying tag digest..."
CURRENT_DIGEST="$(aws ecr describe-images \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --repository-name "${REPOSITORY_NAME}" \
  --image-ids imageTag="${IMAGE_TAG}" \
  --query 'imageDetails[0].imageDigest' \
  --output text)"

if [[ "${CURRENT_DIGEST}" != "${IMAGE_DIGEST}" ]]; then
  echo "ERROR: ${REPOSITORY_NAME}:${IMAGE_TAG} now points to ${CURRENT_DIGEST}, expected ${IMAGE_DIGEST}"
  exit 1
fi

echo "4. Looking up App Runner service ARN..."
SERVICE_ARN="$(aws apprunner list-services \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn | [0]" \
  --output text)"

if [[ -z "${SERVICE_ARN}" || "${SERVICE_ARN}" == "None" ]]; then
  echo "ERROR: App Runner service ${SERVICE_NAME} not found"
  exit 1
fi

echo "5. Starting App Runner deployment..."
aws apprunner start-deployment \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --service-arn "${SERVICE_ARN}" \
  >/dev/null

echo "6. Current service status:"
aws apprunner describe-service \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --service-arn "${SERVICE_ARN}" \
  --query 'Service.Status' \
  --output text

echo ""
echo "Rollback started successfully."
echo "Verified ${REPOSITORY_NAME}:${IMAGE_TAG} -> ${IMAGE_DIGEST}"
