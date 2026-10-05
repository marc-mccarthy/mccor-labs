output "bucket_name" {
  description = "S3 bucket that holds the website files"
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "CloudFront distribution ID (needed for cache invalidations)"
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront hostname your DNS records point at, e.g. d1234.cloudfront.net"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront's own zone ID, needed for Route 53 alias records"
  value       = aws_cloudfront_distribution.site.hosted_zone_id
}
