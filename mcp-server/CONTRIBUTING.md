# Contributing to NewsKit MCP Server

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/CodeAKrome/newskit-mcp-server.git
cd newskit-mcp-server
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
pip install chromadb sentence-transformers pandas numpy scikit-learn
```

4. Build the project:
```bash
npm run build
```

## Making Changes

1. Create a new branch for your feature or bug fix
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request

## Code Style

- TypeScript: Use strict mode, follow existing patterns
- Python: Follow PEP 8 style guide
- Keep functions focused and well-documented

## Testing

Before submitting a PR:
- Test all four tools (categorize_articles, load_articles, search_similar, get_categories)
- Verify the build compiles without errors
- Test with sample data

## Pull Request Process

1. Ensure your PR description clearly describes the problem and solution
2. Reference any related issues
3. Wait for review and address feedback

## Questions?

Open an issue for questions or discussion.