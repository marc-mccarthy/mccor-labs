mock_provider "aws" {
  override_data {
    target = data.aws_cloudfront_cache_policy.optimized
    values = {
      id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    }
  }

  override_data {
    target = data.aws_iam_policy_document.site
    values = {
      json = "{}"
    }
  }
}

override_resource {
  target          = aws_cloudfront_response_headers_policy.site
  override_during = plan
  values          = { id = "rhp-test" }
}

override_resource {
  target          = aws_cloudfront_distribution.site
  override_during = plan
  values          = { arn = "arn:aws:cloudfront::111111111111:distribution/ETEST" }
}

override_resource {
  target          = aws_cloudfront_origin_access_control.api
  override_during = plan
  values          = { id = "oac-api-test" }
}

variables {
  name            = "t"
  aliases         = ["example.com", "www.example.com"]
  certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/x"
}

run "headers" {
  command = plan

  assert {
    condition     = aws_cloudfront_distribution.site.http_version == "http2and3"
    error_message = "Distribution must serve HTTP/3."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].access_control_max_age_sec == 31536000
    error_message = "HSTS max-age must be one year."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].include_subdomains
    error_message = "HSTS must include subdomains."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].override
    error_message = "HSTS must override the origin header."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].frame_options[0].frame_option == "DENY"
    error_message = "X-Frame-Options must be DENY."
  }

  assert {
    condition = anytrue([
      for h in aws_cloudfront_response_headers_policy.site.custom_headers_config[0].items :
      h.header == "Content-Security-Policy-Report-Only" && h.value == local.csp
    ])
    error_message = "Content-Security-Policy-Report-Only must carry local.csp."
  }

  assert {
    condition = anytrue([
      for h in aws_cloudfront_response_headers_policy.site.custom_headers_config[0].items :
      h.header == "Permissions-Policy"
    ])
    error_message = "Permissions-Policy header is missing."
  }

  assert {
    condition     = strcontains(local.csp, "script-src 'self' 'unsafe-inline'")
    error_message = "CSP must allow same-origin and inline scripts."
  }

  assert {
    condition     = !strcontains(local.csp, "upgrade-insecure-requests")
    error_message = "upgrade-insecure-requests is ignored in Report-Only and must be left out."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].response_headers_policy_id == "rhp-test"
    error_message = "Default cache behavior must use the security headers policy."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].preload == false
    error_message = "HSTS preload must stay off."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].referrer_policy[0].referrer_policy == "strict-origin-when-cross-origin"
    error_message = "Referrer-Policy must be strict-origin-when-cross-origin."
  }

  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].content_type_options[0].override == true
    error_message = "X-Content-Type-Options must be set and override the origin header."
  }

  assert {
    condition = anytrue([
      for h in aws_cloudfront_response_headers_policy.site.custom_headers_config[0].items :
      h.header == "Permissions-Policy" && h.value == "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    ])
    error_message = "Permissions-Policy must deny camera, microphone, geolocation, payment and usb."
  }

  assert {
    condition     = strcontains(local.csp, "object-src 'none'") && strcontains(local.csp, "frame-ancestors 'none'")
    error_message = "CSP must block plugins and framing."
  }
}

run "function" {
  command = plan

  variables {
    aliases = ["Example.com", "www.example.com"]
  }

  assert {
    condition     = strcontains(aws_cloudfront_function.viewer_request.code, "var PRIMARY_HOST = \"example.com\";")
    error_message = "PRIMARY_HOST must render as the lowercased first alias."
  }

  assert {
    condition     = !strcontains(aws_cloudfront_function.viewer_request.code, "REDIRECT_HOSTS")
    error_message = "The function must not carry REDIRECT_HOSTS."
  }
}

run "no_domain" {
  command = plan

  variables {
    aliases         = []
    certificate_arn = null
  }

  assert {
    condition     = aws_cloudfront_distribution.site.viewer_certificate[0].cloudfront_default_certificate == true && length(aws_cloudfront_distribution.site.aliases) == 0
    error_message = "Without a domain the distribution must use the default certificate and no aliases."
  }

  assert {
    condition     = strcontains(aws_cloudfront_function.viewer_request.code, "var PRIMARY_HOST = \"\";")
    error_message = "PRIMARY_HOST must render empty without a domain."
  }
}

run "no_api" {
  command = plan

  assert {
    condition     = length(aws_cloudfront_distribution.site.ordered_cache_behavior) == 0 && length(aws_cloudfront_origin_access_control.api) == 0
    error_message = "Without api_origins the distribution must not change."
  }
}

run "api_origins" {
  command = plan

  variables {
    api_origins       = [{ path_pattern = "/api/contact", function_url_domain = "abc123.lambda-url.us-east-1.on.aws" }]
    api_function_arns = { contact = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
  }

  assert {
    condition     = aws_cloudfront_origin_access_control.api[0].origin_access_control_origin_type == "lambda" && aws_cloudfront_origin_access_control.api[0].signing_behavior == "always"
    error_message = "The API OAC must be a Lambda OAC that always signs."
  }

  assert {
    condition     = anytrue([for o in aws_cloudfront_distribution.site.origin : o.domain_name == "abc123.lambda-url.us-east-1.on.aws" && o.origin_id == "api-contact"])
    error_message = "The Function URL host must be an origin."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.ordered_cache_behavior[0].path_pattern == "/api/contact" && aws_cloudfront_distribution.site.ordered_cache_behavior[0].target_origin_id == "api-contact"
    error_message = "The /api/contact behavior must route to its origin."
  }

  assert {
    condition     = contains(aws_cloudfront_distribution.site.ordered_cache_behavior[0].allowed_methods, "POST") && aws_cloudfront_distribution.site.ordered_cache_behavior[0].viewer_protocol_policy == "https-only"
    error_message = "The API behavior must allow POST over HTTPS only."
  }

  assert {
    condition     = data.aws_cloudfront_cache_policy.disabled.name == "Managed-CachingDisabled" && data.aws_cloudfront_origin_request_policy.all_viewer_except_host.name == "Managed-AllViewerExceptHostHeader"
    error_message = "The API policies must be the managed CachingDisabled and AllViewerExceptHostHeader."
  }

  assert {
    condition     = aws_cloudfront_distribution.site.ordered_cache_behavior[0].response_headers_policy_id == "rhp-test"
    error_message = "The API behavior must use the security headers policy."
  }

  assert {
    condition     = anytrue([for o in aws_cloudfront_distribution.site.origin : o.origin_id == "api-contact" && o.origin_access_control_id == "oac-api-test"])
    error_message = "The API origin must be signed by the API OAC."
  }

  assert {
    condition     = alltrue([for b in aws_cloudfront_distribution.site.ordered_cache_behavior : length(b.function_association) == 0])
    error_message = "API behaviors must carry no function_association: the viewer-request function would redirect a POST into a body-less GET."
  }

  assert {
    condition     = length(aws_cloudfront_distribution.site.default_cache_behavior[0].function_association) == 1 && aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"
    error_message = "The default behavior must keep its viewer-request function and redirect."
  }

  assert {
    condition     = aws_lambda_permission.api_url["contact"].action == "lambda:InvokeFunctionUrl" && aws_lambda_permission.api_url["contact"].function_url_auth_type == "AWS_IAM" && aws_lambda_permission.api_url["contact"].principal == "cloudfront.amazonaws.com"
    error_message = "CloudFront must be allowed lambda:InvokeFunctionUrl with AWS_IAM."
  }

  assert {
    condition     = aws_lambda_permission.api_url["contact"].source_arn == "arn:aws:cloudfront::111111111111:distribution/ETEST" && aws_lambda_permission.api_invoke["contact"].source_arn == "arn:aws:cloudfront::111111111111:distribution/ETEST"
    error_message = "Both permissions must be scoped to this distribution."
  }

  assert {
    condition     = aws_lambda_permission.api_invoke["contact"].principal == "cloudfront.amazonaws.com"
    error_message = "The invoke permission must name the CloudFront principal."
  }

  assert {
    condition     = aws_lambda_permission.api_invoke["contact"].action == "lambda:InvokeFunction" && aws_lambda_permission.api_invoke["contact"].invoked_via_function_url == true
    error_message = "CloudFront must be allowed lambda:InvokeFunction via the Function URL."
  }
}

run "api_order" {
  command = plan

  variables {
    api_origins = [
      { path_pattern = "/api/contact", function_url_domain = "abc123.lambda-url.us-east-1.on.aws" },
      { path_pattern = "/api/*", function_url_domain = "def456.lambda-url.us-east-1.on.aws" },
    ]
  }

  assert {
    condition     = [for b in aws_cloudfront_distribution.site.ordered_cache_behavior : b.path_pattern] == ["/api/contact", "/api/*"]
    error_message = "Behaviors must keep the api_origins order: CloudFront uses the first match."
  }

  assert {
    condition     = [for b in aws_cloudfront_distribution.site.ordered_cache_behavior : b.target_origin_id] == ["api-contact", "api"]
    error_message = "Each behavior must target its own origin."
  }
}
