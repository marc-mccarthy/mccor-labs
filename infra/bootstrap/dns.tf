resource "aws_route53_delegation_set" "main" {
  reference_name = var.NAME
  lifecycle {
    prevent_destroy = true
  }
}
resource "aws_route53domains_registered_domain" "this" {
  count              = var.DOMAIN_REGISTRAR_IS_ROUTE53 ? 1 : 0
  domain_name        = var.DOMAIN_NAME
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
    contact_type      = var.DOMAIN_CONTACT.contact_type
    organization_name = var.DOMAIN_CONTACT.organization_name
    first_name        = var.DOMAIN_CONTACT.first_name
    last_name         = var.DOMAIN_CONTACT.last_name
    email             = var.DOMAIN_CONTACT.email
    phone_number      = var.DOMAIN_CONTACT.phone_number
    address_line_1    = var.DOMAIN_CONTACT.address_line_1
    address_line_2    = var.DOMAIN_CONTACT.address_line_2
    city              = var.DOMAIN_CONTACT.city
    state             = var.DOMAIN_CONTACT.state
    zip_code          = var.DOMAIN_CONTACT.zip_code
    country_code      = var.DOMAIN_CONTACT.country_code
  }
}
