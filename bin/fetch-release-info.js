import fs from 'fs/promises'
import { resolve } from 'path'
import axios from 'axios'
import { config as conf } from 'dotenv'

conf()

const cwd = process.cwd()

const token = process.env.GITHUB_TOKEN
const outputPath = resolve(cwd, 'data/electerm-github-release.json')

if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is not set')
  process.exit(1)
}

async function fetchReleaseInfo () {
  const response = await axios.get('https://api.github.com/repos/electerm/electerm/releases/latest', {
    headers: {
      'User-Agent': 'electerm-website',
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })

  return {
    action: 'published',
    release: response.data
  }
}

async function fetchAndroidReleaseInfo () {
  const response = await axios.get('https://api.github.com/repos/electerm/electerm-android/releases/latest', {
    headers: {
      'User-Agent': 'electerm-website',
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })

  return response.data.assets || []
}

async function fetchRepoInfo () {
  const response = await axios.get('https://api.github.com/repos/electerm/electerm', {
    headers: {
      'User-Agent': 'electerm-website',
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json'
    }
  })

  return {
    starCount: response.data.stargazers_count
  }
}

async function main () {
  console.log('Fetching latest release info from GitHub...')
  const releaseInfo = await fetchReleaseInfo()
  if (releaseInfo.release.body) {
    releaseInfo.release.body = releaseInfo.release.body.replace(/[\r\n]+-{3,}[\r\n]+Download下载: \[https:\/\/electerm\.org\]\(https:\/\/electerm\.org\)\s*$/, '')
  }
  console.log('Fetching Android release assets from GitHub...')
  const androidAssets = await fetchAndroidReleaseInfo()
  releaseInfo.release.assets = [...(releaseInfo.release.assets || []), ...androidAssets]
  console.log('Fetching repository info from GitHub...')
  const repoInfo = await fetchRepoInfo()
  const output = { ...releaseInfo, ...repoInfo }
  // Write to file
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2))
  console.log(`Release info saved to ${outputPath}`)
}

main()
