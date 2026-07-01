import { readFileSync } from "node:fs"
import path from "node:path"
import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Version courante = champ "version" de package.json (incremente par deploy.py a
// chaque deploiement). Figee dans le bundle (__BUILD_ID__) et ecrite dans
// dist/version.json : le client compare les deux pour detecter un deploiement.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
) as { version: string }
const buildId = process.env.VITE_BUILD_ID ?? pkg.version

// Emet dist/version.json au build (asset non hache, doit etre servi sans cache).
function versionManifest(): Plugin {
  return {
    name: "lanely-version-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: buildId }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), tailwindcss(), versionManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Écoute sur toutes les interfaces réseau → accessible via l'IP LAN de la
    // machine (utile pour tester depuis un mobile sur le même réseau).
    host: true,
    port: 5173,
    // Origine fixe : sans ça Vite glisse sur 5174/5175… si 5173 est pris, et
    // l'origine ne correspond plus aux « Authorized JavaScript origins » Google.
    strictPort: true,
  },
})
