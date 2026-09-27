# Shiftly – Work Hours Tracking & Calculation System

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://dmaman86.github.io/shiftly/)

Shiftly tracks work shifts and explains Israeli payroll calculations through a
transparent, testable domain model.

## Quick start

Requirements: Node.js 24. Bun 1.3.14 is the preferred package manager, but the
scripts can be run with npm or Bun.

```bash
git clone https://github.com/dmaman86/shiftly.git
cd shiftly
nvm install
nvm use
npm install
npm run dev
```

Open `http://localhost:5173/shiftly`.

## Documentation

- [Detailed project reference](docs/reference/README.md)
- [Detailed Hebrew reference](docs/reference/README_HE.md)
- [Architecture documentation](docs/architecture/)
- [Generated architecture diagrams](docs/architecture/generated/)
- [Architecture history](docs/architecture/history/)

## Common commands

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run test:e2e
```

The same scripts can be invoked through Bun when using the repository's
preferred package manager.

## License

This project is licensed under the [MIT License](LICENSE).
