import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputName = process.argv[2] ?? 'dist'
const allowedOutputs = new Set(['dist', 'release'])

if (!allowedOutputs.has(outputName)) {
  throw new Error(`Refusing to clean unexpected output directory: ${outputName}`)
}

const outputDirectory = resolve(process.cwd(), outputName)

await rm(outputDirectory, { recursive: true, force: true })
