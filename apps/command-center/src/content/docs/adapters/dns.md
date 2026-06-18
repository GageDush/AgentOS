# DNS

Collects **public DNS records** for domains and subdomains.

## Common inputs

- Domain
- Subdomain / FQDN

## Common outputs

- A / AAAA records
- MX records
- TXT records
- NS records
- CNAME records

## Useful components

- Record parser
- Domain graph ([Graph](/docs/ui/graph))
- Exposure table
- Change tracker (diff across collection jobs)

## Tool patterns

- [Domain exposure mapper](/docs/patterns/domain-exposure-mapper)
- [Brand impersonation monitor](/docs/patterns/brand-impersonation-monitor)

## Reference

Pair with RDAP/WHOIS parsers in [Parser component](/docs/components/parser). [OWASP Amass](https://owasp.org/www-project-amass/) DNS enumeration subcommands are a practical reference for orchestration.
