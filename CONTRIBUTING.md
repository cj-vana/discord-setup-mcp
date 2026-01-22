# Contributing to Discord Server Setup MCP

Thank you for your interest in contributing to Discord Server Setup MCP! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **macOS** (required for AppleScript automation development and testing)
- **Node.js** 18.0.0 or higher
- **Discord Desktop App** installed and logged in
- **Git** for version control
- Accessibility permissions enabled for your terminal/editor (System Preferences > Privacy & Security > Accessibility)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/discord-setup-mcp.git
cd discord-setup-mcp
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/discord-setup-mcp.git
```

## Development Setup

1. **Install dependencies**:

```bash
npm install
```

2. **Build the project**:

```bash
npm run build
```

3. **Run in development mode** (with file watching):

```bash
npm run dev
```

4. **Run type checking**:

```bash
npm run typecheck
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point, tool registration
├── automation/           # AppleScript/JXA execution engine
│   ├── executor.ts       # Script execution with timeout/error handling
│   ├── discord.ts        # Discord-specific automation functions
│   └── waiter.ts         # Timing and delay utilities
├── tools/                # MCP tool implementations
│   ├── index.ts          # Re-exports all tools
│   ├── server.ts         # Server management tools
│   ├── channels.ts       # Channel management tools
│   ├── roles.ts          # Role management tools
│   ├── settings.ts       # Settings management tools
│   └── templates.ts      # Template management tools
├── templates/            # Pre-built server configuration templates
│   ├── types.ts          # Template type definitions
│   ├── index.ts          # Template registry
│   └── *.ts              # Individual template files
└── utils/                # Utility functions
    ├── errors.ts         # Custom error classes
    └── validation.ts     # Zod schemas for input validation
```

## How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **Bug fixes**: Fix issues in existing functionality
- **New tools**: Add new MCP tools for Discord automation
- **New templates**: Create pre-built server configuration templates
- **Documentation**: Improve README, CONTRIBUTING, or code comments
- **Performance improvements**: Optimize automation speed or reliability
- **Error handling**: Improve error messages and edge case handling

### Adding a New Tool

1. Create or edit the appropriate file in `src/tools/`
2. Export three items following the established pattern:

```typescript
// Tool definition for MCP registration
export const myToolDefinition = {
  name: 'my_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define parameters
    },
    required: ['requiredParam'],
  },
};

// Zod schema for input validation
export const MyToolInputSchema = z.object({
  requiredParam: z.string(),
});
export type MyToolInput = z.infer<typeof MyToolInputSchema>;

// Handler function
export async function myToolHandler(input: MyToolInput): Promise<Result> {
  // Implementation
}
```

3. Register the tool in `src/index.ts`
4. Add validation schema to `src/utils/validation.ts` if needed

### Adding a New Template

1. Create a new file in `src/templates/` (e.g., `my-template.ts`)
2. Follow the existing template structure with roles, categories, and channels
3. Register the template in `src/templates/index.ts`
4. Update documentation with template details

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking
- Use explicit types for function parameters and return values
- Prefer `interface` for object shapes, `type` for unions/intersections

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line structures
- Keep lines under 100 characters when practical
- Use descriptive variable and function names

### Error Handling

- Use custom error classes from `src/utils/errors.ts`
- Provide meaningful error messages
- Handle edge cases gracefully
- Include context in error messages (e.g., which element wasn't found)

### AppleScript/JXA Guidelines

- Always include timeout handling
- Add appropriate delays for UI elements to load
- Use descriptive comments for complex automation sequences
- Test on different Discord UI states

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature or tool
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `perf`: Performance improvements

### Scopes

- `server`: Server management tools
- `channels`: Channel management tools
- `roles`: Role management tools
- `settings`: Settings management tools
- `templates`: Template functionality
- `automation`: AppleScript/JXA automation
- `validation`: Input validation
- `deps`: Dependencies

### Examples

```bash
feat(channels): add support for forum channels
fix(automation): handle Discord loading state
docs(readme): update installation instructions
refactor(validation): simplify role validation schema
```

## Pull Request Process

### Before Submitting

1. **Update your fork**:

```bash
git fetch upstream
git rebase upstream/main
```

2. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes** following the coding standards

4. **Run type checking**:

```bash
npm run typecheck
```

5. **Build the project**:

```bash
npm run build
```

6. **Test your changes** manually with the Discord desktop app

### Submitting

1. Push your branch to your fork:

```bash
git push origin feature/your-feature-name
```

2. Open a Pull Request against the `main` branch

3. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers (if any)
   - Testing steps performed
   - Screenshots/recordings for UI-related changes

### Review Process

- PRs require at least one approval before merging
- Address review feedback promptly
- Keep PRs focused on a single concern
- Large changes should be discussed in an issue first

## Testing

### Manual Testing Requirements

Since this project relies on visual UI automation, automated testing is limited. Manual testing is required:

1. **Ensure Discord is running** and visible on screen
2. **Grant Accessibility permissions** to your terminal/IDE
3. **Test each modified tool** with various inputs
4. **Verify error handling** by testing edge cases:
   - Discord not running
   - Discord minimized
   - Invalid input values
   - Network interruptions

### Testing Checklist

- [ ] Tool completes successfully with valid input
- [ ] Tool returns appropriate error for invalid input
- [ ] Tool handles Discord not running gracefully
- [ ] Tool handles Discord minimized gracefully
- [ ] Tool does not interfere with other Discord operations
- [ ] Timing delays are appropriate (not too fast/slow)

## Reporting Issues

### Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug.yml) and include:

- macOS version
- Discord version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/recordings if applicable

### Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature.yml) and include:

- Clear description of the feature
- Use case / motivation
- Proposed implementation (if any)
- Willingness to implement

### Security Issues

For security vulnerabilities, please see our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

## Questions?

If you have questions about contributing:

1. Check existing [issues](https://github.com/ORIGINAL_OWNER/discord-setup-mcp/issues) and [discussions](https://github.com/ORIGINAL_OWNER/discord-setup-mcp/discussions)
2. Open a new discussion for general questions
3. Open an issue for specific bugs or feature requests

Thank you for contributing to Discord Server Setup MCP!
