variable "name" {
  description = "Table name"
  type        = string
}

variable "read_capacity" {
  description = "Provisioned read units. The free tier covers 25 in total across all tables in the account."
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "Provisioned write units. The free tier covers 25 in total across all tables in the account."
  type        = number
  default     = 5
}

variable "deletion_protection" {
  description = "Block accidental deletion of the table"
  type        = bool
  default     = true
}

variable "point_in_time_recovery" {
  description = "Continuous backups (billed per GB). Worth turning on once you have real customer data."
  type        = bool
  default     = false
}
