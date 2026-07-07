#!/bin/bash
set -euo pipefail

DOMAIN="groweasy.praanav.in"
KEY_NAME="groweasy-key"
SG_NAME="groweasy-sg"
INSTANCE_NAME="groweasy-prod"
INSTANCE_TYPE="t3.small"
AMI_ID="ami-0f9235932f10668d4"
REGION="${AWS_REGION:-ap-south-1}"

echo "Using region: $REGION"

if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" \
    --query 'KeyMaterial' --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "Created key pair: ${KEY_NAME}.pem"
fi

VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region "$REGION" \
  --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 describe-security-groups --filters Name=group-name,Values="$SG_NAME" --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group --group-name "$SG_NAME" \
    --description "GrowEasy app security group" --vpc-id "$VPC_ID" --region "$REGION" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 22 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 80 --cidr 0.0.0.0/0
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 443 --cidr 0.0.0.0/0
  echo "Created security group: $SG_ID"
fi

USERDATA=$(base64 -w 0 ec2-setup.sh 2>/dev/null || base64 ec2-setup.sh)

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --region "$REGION" \
  --instance-initiated-shutdown-behavior stop \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${INSTANCE_NAME}}]" \
  --user-data "$USERDATA" \
  --query 'Instances[0].InstanceId' --output text)

echo "Launched instance: $INSTANCE_ID"
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo ""
echo "========================================"
echo "GrowEasy EC2 Deployment"
echo "========================================"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP:   $PUBLIC_IP"
echo "Region:      $REGION"
echo ""
echo "DNS: Add an A record:"
echo "  groweasy.praanav.in  ->  $PUBLIC_IP"
echo ""
echo "SSL: certbot runs automatically after DNS propagates"
echo "Admin email on server: pranav@praanav.in"
echo "========================================"
