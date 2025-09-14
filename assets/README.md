# Assets Directory

This directory contains the application icons and assets needed for building the executable.

## Required Files

For a complete build, you'll need:

1. **icon.ico** - Windows application icon (256x256 pixels recommended)
   - Used for the executable file icon
   - Should be in .ico format for Windows

2. **icon.png** - Alternative icon format (512x512 pixels recommended)
   - Used as fallback and for other platforms

3. **loading.gif** (optional) - Loading animation during installer
   - Shown while the application is being installed
   - Should be a small animated GIF

## How to Add Icons

1. Create or find a square icon image (preferably 512x512px)
2. Convert it to .ico format for Windows
3. Place it in this directory as `icon.ico`

## Online Icon Tools

- [ICO Convert](https://icoconvert.com/) - Convert PNG to ICO
- [Favicon Generator](https://www.favicon-generator.org/) - Generate multiple icon formats
- [Canva](https://www.canva.com/) - Design custom icons

## Default Behavior

If no icon is provided, Electron will use the default Electron icon.