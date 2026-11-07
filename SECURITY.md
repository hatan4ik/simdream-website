# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, exposed credential, or customer-data concern. Report it privately to `desk@simdream.co.il` with the subject `SimDream security report`. Include a reproducible description, affected URL or file path, and impact; never include a live customer record or credential in the report.

We acknowledge reports within two business days, triage severity promptly, and coordinate a fix before public disclosure. We welcome good-faith reports and ask researchers not to access customer data, alter bookings, place orders, or degrade availability.

## Credential response

If a credential reaches Git history, a public issue, an action log, or any other public surface:

1. Revoke or rotate it at the issuing provider immediately.
2. Confirm server and GitHub Environment replacement values without printing them.
3. Review secret-scanning alerts and dependent integrations.
4. Remove the value from the current branch and consider history rewriting only after rotation.

## Preventive controls

- `.env*`, certificate/key material, local npm credentials and common service-account files are ignored; `.env.example` remains the safe, value-free template.
- Vitest scans all committable files and the production client bundle for server-only names and credential-shaped values.
- Gitleaks scans full Git history on pull requests and `main` pushes, including the Wix Headless API-key shape.
- GitHub Secret Scanning and Push Protection are enabled for the public repository.
- Dependabot alerts/security updates and CodeQL continuously review dependencies and application code.
- Release credentials exist only as GitHub Environment secrets. They must never be placed in source, dotenv templates, Wix configuration, browser code, or workflow output.
