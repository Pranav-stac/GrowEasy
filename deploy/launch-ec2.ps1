param(
  [string]$GeminiApiKey = $env:GEMINI_API_KEY,
  [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"
$Domain = "groweasy.praanav.in"
$KeyName = "groweasy-key"
$SgName = "groweasy-sg"
$InstanceName = "groweasy-prod"
$InstanceType = "t3.small"
$AmiId = "ami-0f9235932f10668d4"

if (-not $GeminiApiKey) {
  Write-Error "Set GEMINI_API_KEY environment variable before launching."
}

$setupPath = Join-Path $PSScriptRoot "ec2-setup.sh"
$setup = Get-Content $setupPath -Raw
$setup = $setup.Replace("__GEMINI_API_KEY__", $GeminiApiKey)
$userData = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($setup))

Write-Host "AWS Account:" (aws sts get-caller-identity --query Account --output text)
Write-Host "Region: $Region"

$keyPath = Join-Path $PSScriptRoot "$KeyName.pem"
$keyExists = $false
try {
  aws ec2 describe-key-pairs --key-names $KeyName --region $Region | Out-Null
  if ($LASTEXITCODE -eq 0) { $keyExists = $true }
} catch {}

if (-not $keyExists) {
  aws ec2 create-key-pair --key-name $KeyName --region $Region --query KeyMaterial --output text | Out-File -Encoding ascii $keyPath
  icacls $keyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
  Write-Host "Created key pair: $keyPath"
}

$vpcId = aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region $Region --query "Vpcs[0].VpcId" --output text
$sgId = aws ec2 describe-security-groups --filters Name=group-name,Values=$SgName --region $Region --query "SecurityGroups[0].GroupId" --output text 2>$null

if (-not $sgId -or $sgId -eq "None") {
  $sgId = aws ec2 create-security-group --group-name $SgName --description "GrowEasy app" --vpc-id $vpcId --region $Region --query GroupId --output text
  aws ec2 authorize-security-group-ingress --group-id $sgId --region $Region --protocol tcp --port 22 --cidr 0.0.0.0/0 | Out-Null
  aws ec2 authorize-security-group-ingress --group-id $sgId --region $Region --protocol tcp --port 80 --cidr 0.0.0.0/0 | Out-Null
  aws ec2 authorize-security-group-ingress --group-id $sgId --region $Region --protocol tcp --port 443 --cidr 0.0.0.0/0 | Out-Null
  Write-Host "Created security group: $sgId"
}

$instanceId = aws ec2 run-instances `
  --image-id $AmiId `
  --instance-type $InstanceType `
  --key-name $KeyName `
  --security-group-ids $sgId `
  --region $Region `
  --user-data $userData `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName}]" `
  --query "Instances[0].InstanceId" --output text

Write-Host "Launched instance: $instanceId"
aws ec2 wait instance-running --instance-ids $instanceId --region $Region

$publicIp = aws ec2 describe-instances --instance-ids $instanceId --region $Region --query "Reservations[0].Instances[0].PublicIpAddress" --output text

Write-Host ""
Write-Host "========================================"
Write-Host "GrowEasy EC2 Deployment"
Write-Host "========================================"
Write-Host "Instance ID: $instanceId"
Write-Host "Public IP:   $publicIp"
Write-Host "Region:      $Region"
Write-Host "Domain:      https://$Domain"
Write-Host "Admin email: pranav@praanav.in"
Write-Host ""
Write-Host "DNS A record:"
Write-Host "  $Domain  ->  $publicIp"
Write-Host "========================================"

$publicIp | Out-File -Encoding utf8 (Join-Path $PSScriptRoot "DEPLOYED_IP.txt")
