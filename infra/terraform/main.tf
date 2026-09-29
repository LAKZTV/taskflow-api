terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state on an S3-compatible endpoint (LocalStack). Never commit terraform.tfstate.
  backend "s3" {
    bucket                      = "taskflow-tfstate"
    key                         = "taskflow/terraform.tfstate"
    region                      = "us-east-1"
    endpoints                   = { s3 = "http://host.docker.internal:4566" }
    access_key                  = "test"
    secret_key                  = "test"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    ec2 = "http://host.docker.internal:4566"
    s3  = "http://host.docker.internal:4566"
  }
}

variable "app_port" {
  description = "Port the Taskflow API is exposed on"
  type        = number
  default     = 8080
}

variable "allowed_cidr" {
  description = "Network allowed to reach the app (never 0.0.0.0/0)"
  type        = string
  default     = "10.0.0.0/16"
}

variable "ami_id" {
  description = "AMI for the instance (must be one LocalStack's mock EC2 backend actually knows about)"
  type        = string
  default     = "ami-760aaa0f"
}

resource "aws_security_group" "app" {
  name        = "taskflow-app"
  description = "Allow the Taskflow API port from the private network"

  ingress {
    description = "Taskflow API from the private network"
    from_port   = var.app_port
    to_port     = var.app_port
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }

  egress {
    description = "Outbound only within the private network"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.allowed_cidr]
  }
}

resource "aws_instance" "app" {
  # checkov:skip=CKV2_AWS_41: lab host never calls AWS APIs, so an instance role would only add unused privilege
  ami                    = var.ami_id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.app.id]
  monitoring             = true
  ebs_optimized          = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required" # IMDSv2 only
  }

  root_block_device {
    encrypted = true
  }

  tags = {
    Name = "taskflow-app"
  }
}

output "instance_address" {
  description = "Private IP of the instance (use public_ip on a real cloud)"
  value       = aws_instance.app.private_ip
}
