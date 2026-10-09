resource "aws_bedrock_guardrail" "lab" {
  name                      = "${var.name}-lab"
  description               = "Content and prompt-attack filters for the should-this-be-ai lab"
  blocked_input_messaging   = "Blocked."
  blocked_outputs_messaging = "Blocked."

  content_policy_config {
    dynamic "filters_config" {
      for_each = toset(["SEXUAL", "VIOLENCE", "HATE", "INSULTS", "MISCONDUCT"])
      content {
        type            = filters_config.value
        input_strength  = "HIGH"
        output_strength = "HIGH"
      }
    }

    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }

    tier_config {
      tier_name = "CLASSIC"
    }
  }
}

resource "aws_bedrock_guardrail_version" "lab" {
  guardrail_arn = aws_bedrock_guardrail.lab.guardrail_arn
  description   = "lab"
}
