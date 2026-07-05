import { readFileSync } from 'fs'
import { join } from 'path'

let cached

export default function handler (req, res) {
  if (!cached) {
    try {
      cached = readFileSync(join(process.cwd(), 'public', '404.html'), 'utf-8')
    } catch (e) {
      cached = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>404</title></head><body><h1>404 Not Found</h1><a href="/">Home</a></body></html>'
    }
  }
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(cached)
}
