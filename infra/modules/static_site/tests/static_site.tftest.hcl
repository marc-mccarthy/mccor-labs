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
