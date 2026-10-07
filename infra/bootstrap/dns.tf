resource "aws_route53_delegation_set" "main" {
  reference_name = var.name
  lifecycle {
    prevent_destroy = true
  }
}
resource "aws_route53domains_registered_domain" "this" {
  count              = var.domain_registrar_is_route53 ? 1 : 0
  domain_name        = var.domain_name
  auto_renew         = true
  transfer_lock      = true
  admin_privacy      = true
  registrant_privacy = true
  tech_privacy       = true
  billing_privacy    = true
  dynamic "name_server" {
    for_each = aws_route53_delegation_set.main.name_servers
    content {
      name = name_server.value
    }
  }
  registrant_contact {
    contact_type      = var.domain_contact.contact_type
    organization_name = var.domain_contact.organization_name
    first_name        = var.domain_contact.first_name
    last_name         = var.domain_contact.last_name
    email             = var.domain_contact.email
    phone_number      = var.domain_contact.phone_number
    address_line_1    = var.domain_contact.address_line_1
    address_line_2    = var.domain_contact.address_line_2
    city              = var.domain_contact.city
    state             = var.domain_contact.state
    zip_code          = var.domain_contact.zip_code
    country_code      = var.domain_contact.country_code
  }
}
