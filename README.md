# Tournament Brackets

A modern, feature-rich tournament management application built with **React**, **TypeScript**, and **Electron**. Manage double-elimination tournaments with advanced rematch avoidance, table assignment, live scoring, and professional bracket visualization.

## 📥 Download & Install

### Windows Users
**[📁 Download Latest Release](https://github.com/Hnton/tournament-brackets-react/releases/latest)**

1. Download the `TournamentBrackets-Setup-vX.X.X.exe` file
2. Run the installer (Windows may show a security warning - click "More info" then "Run anyway")
3. Launch "Tournament Brackets" from your Start Menu

### For Developers
See the [Development Setup](#-development-setup) section below.

![Tournament Brackets Demo](example/Screenshot%202025-09-13%20213520.png)

## ✨ Features

### 🏆 Tournament Management
- **Double-elimination brackets** with comprehensive rematch avoidance
- **Support for 4-512 players** with mathematically correct bracket structures  
- **Smart cross-stream placement** prevents early rematches until semifinals
- **Real-time bracket progression** as matches are completed
- **Tournament completion detection** with winner announcement
- **Losers bracket integration** with proper WB→LB mapping for all bracket sizes

### 📊 Table Management
- **Dual-tab interface**: Bracket view and Table management
- **Auto-assign system** with individual table controls
- **Custom table naming** (Stream table + numbered tables)
- **Live match assignments** with drag-and-drop feel
- **Synchronized scoring** across both tabs

### 🎯 Scoring System
- **Unified scoring modal** for consistent data entry
- **Real-time validation** (no tied scores allowed)
- **Edit completed matches** with automatic bracket recalculation
- **Score persistence** across tab switches

### 📋 Player Management
- **CSV file import** for bulk player uploads
- **Manual player entry** with name and phone fields
- **Player list editing** with add/remove functionality
- **Demo data generation** for testing

### 🎨 Modern UI/UX
- **Responsive design** that adapts to window size
- **Professional styling** with CSS custom properties
- **Interactive tooltips** and hover states
- **Keyboard navigation** support
- **Accessibility features** (ARIA labels, focus management)

## 🚀 Development Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tournament-brackets-react.git
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

The application will launch in a new Electron window.

### Building for Production

```bash
# Package the application
npm run package

# Create distributable packages
npm run make
```

## 📁 Project Structure

```
src/
├── 📁 components/           # React UI components
│   ├── BracketScoreModal.tsx    # Bracket scoring interface
│   ├── BracketsViewer.tsx       # Tournament bracket visualization
│   ├── PlayerList.tsx           # Player management
│   ├── PlayerUpload.tsx         # CSV import functionality
│   └── TableAssignmentNew.tsx   # Table management UI
│
├── 📁 services/            # Business logic & data management
│   ├── memoryStorage.ts    # In-memory storage for brackets-manager
│   ├── tableManager.ts     # Table assignment algorithms
│   └── tournamentService.ts # Tournament management service
│
├── 📁 types/              # TypeScript type definitions
│   └── index.ts           # Core interfaces (Player, Match, etc.)
│
├── 📁 utils/              # Helper functions & utilities
│   └── index.ts           # Common utilities
│
└── renderer.tsx            # Main application component
```

## 🎮 Usage Guide

### Starting a Tournament

1. **Add Players**
   - Upload a CSV file with player data
   - Or manually add players using the form
   - Use "Generate Demo" for testing

2. **Generate Bracket**
   - Click "Start Tournament" to create the bracket
   - Players are automatically shuffled and seeded
   - BYEs are strategically placed if needed

3. **Manage Tables**
   - Switch to "Table Management" tab
   - Assign matches to tables manually or use auto-assign
   - Configure table names and settings

4. **Score Matches**
   - Click any match to enter scores
   - Scores are validated (ties not allowed)
   - Winners automatically advance to next round

### CSV Import Format

Your CSV file may include additional optional columns to carry metadata used for disambiguation and Fargo data. The supported columns (in order) are:

```csv
name,phone,email,membershipId,city,state,effectiveRating,robustness
```

Only `name` and `phone` are required. Other columns are optional — leave them empty if not available. Example:

```csv
John Doe,555-0123,john@example.com,12345,San Diego,CA,1780,0.42
Jane Smith,555-0456,jane@example.com,23456,Portland,OR,1650,0.31
Mike Johnson,555-0789,,,,,,
```

Notes:
- `effectiveRating` and `robustness` are numeric values (if available).
- `membershipId` helps allow identical display names to coexist and is used when present.

### Table Naming Convention

- **First table**: Named "Stream" 
- **Additional tables**: Numbered as "Table 1", "Table 2", etc.
- **Custom names**: Click table names to edit

## 🛠️ Technical Details

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron
- **Bundling**: Webpack
- **Styling**: CSS with custom properties
- **Build Tool**: Electron Forge

### Key Technologies
- **React Hooks** for state management
- **TypeScript interfaces** for type safety
- **CSS Grid & Flexbox** for responsive layouts
- **Electron IPC** for desktop integration
- **Modular architecture** for maintainability

### Architecture Highlights

- **Component-based design** with clear separation of concerns
- **Service layer** for business logic isolation
- **Centralized type definitions** for consistency
- **Utility functions** for code reuse
- **Unified scoring system** across all interfaces

## 🧪 Development

### Available Scripts

```bash
npm start          # Start development server
npm run package    # Package for current platform
npm run make       # Create distributable
npm run lint       # Run linting (placeholder)
```

### Adding Features

1. **New Components**: Add to `src/components/`
2. **Business Logic**: Add to `src/services/`
3. **Types**: Update `src/types/index.ts`
4. **Utilities**: Add to `src/utils/index.ts`

### Code Style

- Use **TypeScript** for all new files
- Follow **React hooks** patterns
- Implement **proper error handling**
- Add **TypeScript interfaces** for all data
- Use **CSS custom properties** for theming

## 🏗️ Building & Deployment

### Local Build

```bash
# Build Windows executable
npm run build

# Build for specific platform
npm run make:win

# Package without installer
npm run package
```

The built files will be in the `out/` directory:
- **Installer**: `out/make/squirrel.windows/x64/Tournament Brackets-X.X.X Setup.exe`
- **Portable**: `out/Tournament Brackets-win32-x64/TournamentBrackets.exe`

### Automated Releases

This project uses **GitHub Actions** for automated builds and releases:

1. **Push a version tag** to trigger a release:
   ```bash
   npm version patch  # or minor, major
   git push origin v1.0.1
   ```

2. **GitHub Actions will automatically**:
   - Build the Windows executable
   - Run all tests
   - Create a GitHub release
   - Upload the .exe installer as a release asset

3. **Users can then download** from the [Releases page](https://github.com/Hnton/tournament-brackets-react/releases)

### Manual Release

```bash
# Build and publish to GitHub (requires GITHUB_TOKEN)
npm run dist
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- **Test thoroughly** with demo data
- **Maintain type safety** throughout
- **Follow existing patterns** for consistency
- **Update documentation** for new features
- **Consider accessibility** in UI changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Author

**Mikael Hinton**
- Email: mikael.hinton19@gmail.com
- GitHub: [@your-username](https://github.com/your-username)

## 🙏 Acknowledgments

- Built with [Electron Forge](https://www.electronforge.io/)
- Styled with modern CSS practices
- Inspired by professional tournament management needs

---

## 📸 Screenshots

### Bracket View
The main tournament bracket with real-time updates and interactive match scoring.

### Table Management
Comprehensive table assignment with auto-assign functionality and custom naming.

### Player Management
Easy CSV import and manual player entry with validation.

---

**Made with ❤️ for tournament organizers**