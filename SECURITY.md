# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in Discord Server Setup MCP, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email your findings to the repository maintainers (see the repository contact information)
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Assessment**: We will investigate and assess the vulnerability within 7 days
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Credit**: We will credit you in the release notes (unless you prefer anonymity)

## Security Considerations

### macOS Accessibility Permissions

This MCP server requires macOS Accessibility permissions to control the Discord application. Users should:

- Only grant Accessibility permissions to trusted applications
- Review which applications have Accessibility access in System Preferences > Privacy & Security > Accessibility
- Revoke permissions when no longer needed

### AppleScript/JXA Execution

The server executes AppleScript and JavaScript for Automation (JXA) code to control Discord. Security considerations:

- All automation scripts are executed locally on the user's machine
- Scripts only interact with the Discord desktop application
- No data is transmitted to external servers by this MCP server
- Input validation using Zod schemas helps prevent injection attacks

### MCP Protocol Security

- The server communicates via stdio transport (standard input/output)
- No network ports are opened by the server itself
- Communication is limited to the local MCP client (e.g., Claude Desktop)

### Input Validation

All user inputs are validated using Zod schemas before processing:

- Server names, channel names, and role names are sanitized
- Color values are validated against expected formats
- Permission values are validated against allowed Discord permissions

## Best Practices for Users

1. **Keep Dependencies Updated**: Regularly run `npm update` to get security patches
2. **Review Permissions**: Only grant this tool the minimum necessary permissions
3. **Audit Usage**: Monitor what operations the MCP server performs
4. **Secure Your Discord Account**: Use strong passwords and enable 2FA on Discord
5. **Local Use Only**: This tool is designed for local automation only

## Scope

The following are considered in-scope for security reports:

- Remote code execution vulnerabilities
- Privilege escalation
- Data exfiltration
- Injection vulnerabilities (AppleScript, JXA)
- Authentication/authorization bypasses
- Sensitive data exposure

The following are out-of-scope:

- Vulnerabilities in Discord itself (report to Discord)
- Vulnerabilities in macOS (report to Apple)
- Social engineering attacks
- Physical access attacks
- Denial of service against local resources

## Security Updates

Security updates will be released as patch versions and announced in:

- GitHub Releases
- CHANGELOG.md

Users are encouraged to watch this repository for notifications about security updates.
