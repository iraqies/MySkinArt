<p align="center">
  <img src="lib/logo_nobg.png" alt="MySkinArt Logo" width="120">
</p>

<h1 align="center">MySkinArt</h1>

<p align="center">
  A NameMC skin art tool — split, upload, and manage skin art on NameMC.
</p>

<p align="center">
  <a href="https://github.com/iraqies/MySkinArt/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/electron-28-blueviolet.svg" alt="Electron">
</p>

---

## About

MySkinArt is an open-source Electron application that automates the process of splitting skin art images into individual Minecraft skin tiles and uploading them to NameMC. It handles the full workflow — from image processing to sequential upload with NameMC verification.

## Features

- **Skin Art Splitting** — Automatically splits a 72x24 skin art image into 27 individual 8x8 tiles
- **Template Gallery** — Browse and use pre-made skin art templates, filterable by category (Nature, Flag, Cape, Anime)
- **Microsoft Auth** — Sign in with your Microsoft account via device code flow
- **NameMC Upload** — Upload skins directly to NameMC with automatic verification
- **NameMC Claim** — Claim your skin art on NameMC by connecting to a Minecraft server
- **Skin Model Detection** — Auto-detects slim (Alex) or wide (Steve) model from your current skin
- **Custom Base Skin** — Optionally use your own 64x64 base skin template
- **Export Only** — Export generated skins without uploading

## Screenshots

<p align="center">
  <img src="lib/logo.png" alt="MySkinArt" width="480">
</p>

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- Windows OS

## Installation

```bash
# Clone the repository
git clone https://github.com/iraqies/MySkinArt.git

# Navigate to the project
cd MySkinArt

# Install dependencies
npm install

# Start the app
npm start
```

## How It Works

1. **Select Image** — Pick a 72x24 skin art PNG (or choose from the template gallery)
2. **Optional Base Skin** — Provide a custom 64x64 base skin or use the default
3. **Optional Original Skin** — Select your original skin for slot #27, or let the app auto-detect it from your MC account
4. **Generate** — The app splits the image into 27 tiles and generates individual skin files
5. **Upload** — Sign in with Microsoft and upload each tile to NameMC in order
6. **Verify** — The app checks NameMC and the session server to confirm each skin uploaded correctly
7. **Done** — View your profile on NameMC

## Tech Stack

- [Electron](https://www.electronjs.org/) — Desktop framework
- [Sharp](https://sharp.pixelplumbing.com/) — Image processing
- [minecraft-protocol](https://github.com/PrismarineJS/minecraft-protocol) — Minecraft server connection for NameMC claiming

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Author

Made by **[Iraqies](https://github.com/iraqies)**
