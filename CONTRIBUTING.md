# Contributing to Tournament Brackets

Thank you for your interest in contributing to Tournament Brackets! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git**
- **Basic knowledge** of TypeScript, React, and Electron

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/tournament-brackets-react.git
   cd tournament-brackets-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 🧪 Testing

We use **Jest** for testing with a focus on tournament logic correctness:

- **Run all tests**: `npm test`
- **Watch mode**: `npm run test:watch`
- **Test focus areas**:
  - Double elimination tournament logic
  - Rematch avoidance algorithms
  - Bracket structure validation
  - Player advancement correctness

### Adding Tests

When adding new features, please include tests that cover:
- Normal operation scenarios
- Edge cases (minimum/maximum players)
- Error conditions
- Tournament completion flows

## 📋 Code Style & Standards

### TypeScript
- **Use TypeScript** for all new files
- **Define interfaces** for all data structures
- **Avoid `any` type** - use proper typing
- **Use strict type checking**

### React
- **Use functional components** with hooks
- **Follow React best practices**
- **Implement proper error boundaries**
- **Use TypeScript interfaces for props**

### Code Organization
```
src/
├── components/     # React components
├── services/       # Business logic & algorithms
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
└── __tests__/      # Test files
```

### CSS
- **Use CSS custom properties** for theming
- **Follow BEM naming** when applicable
- **Maintain responsive design**
- **Consider accessibility** (ARIA labels, focus states)

## 🔄 Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `test/description` - Test additions/improvements

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for 1024-player tournaments
fix: resolve losers bracket mapping for 128 players
docs: update installation instructions
test: add comprehensive rematch avoidance tests
```

### Pull Request Process

1. **Create a feature branch** from `master`
2. **Make your changes** with proper tests
3. **Ensure all tests pass** (`npm test`)
4. **Build successfully** (`npm run build`)
5. **Update documentation** if needed
6. **Submit a pull request** with:
   - Clear description of changes
   - Screenshots (for UI changes)
   - Test results
   - Breaking changes (if any)

## 🐛 Bug Reports

When reporting bugs, please include:

- **OS and version** (Windows 10, Windows 11, etc.)
- **Tournament Brackets version**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Tournament details** (number of players, tournament phase)
- **Screenshots** (if applicable)

## 💡 Feature Requests

We welcome feature suggestions! Please provide:

- **Clear description** of the feature
- **Use case** and benefits
- **Tournament context** (when/where it applies)
- **Mockups or examples** (if helpful)

## 🚢 Release Process

Releases are automated via GitHub Actions:

1. **Version bump**: `npm version [patch|minor|major]`
2. **Push tags**: Automatically handled by npm postversion script
3. **GitHub Actions**: Builds and creates release
4. **Artifacts**: Windows .exe installer uploaded to release

## 🏗️ Architecture Notes

### Tournament Logic
- **Tournament management** using `brackets-manager` library in `src/services/tournamentService.ts`
- **Table assignment algorithms** in `src/services/tableManager.ts`
- **Mathematical correctness** for all bracket sizes (4-512 players)

### Key Components
- **BracketsViewer.tsx**: Tournament bracket visualization
- **TableAssignmentNew.tsx**: Table management interface with integrated scoring
- **BracketScoreModal.tsx**: Match scoring system
- **PlayerList.tsx**: Player management

### Build System
- **Electron Forge**: Packaging and distribution
- **Webpack**: Bundling and development server
- **TypeScript**: Compilation and type checking
- **Squirrel**: Windows installer creation

## 🤝 Code of Conduct

- **Be respectful** and inclusive
- **Provide constructive feedback**
- **Focus on the issue**, not the person
- **Help others learn** and grow
- **Follow project guidelines**

## 📞 Questions?

- **Open an issue** for bug reports or feature requests
- **Check existing issues** before creating new ones
- **Review documentation** in the README and code comments

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Tournament Brackets! 🏆