resource "aws_route53_zone" "this" {
  count = local.has_domain ? 1 : 0

  name              = var.domain_name
  comment           = "Managed by Terraform"
  delegation_set_id = var.delegation_set_id
}

resource "aws_route53_record" "site" {
  for_each = local.has_domain ? {
    for pair in setproduct(local.hostnames, ["A", "AAAA"]) :
    "${pair[0]}-${pair[1]}" => { name = pair[0], type = pair[1] }
  } : {}

  zone_id = aws_route53_zone.this[0].zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = module.site.distribution_domain_name
    zone_id                = module.site.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
