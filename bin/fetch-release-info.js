import fs from 'fs/promises'
import { resolve } from 'path'
import axios from 'axios'
import { config as conf } from 'dotenv'

conf()

const cwd = process.cwd()

const token = process.env.GITHUB_TOKEN
const outputDir = resolve(cwd, 'data')
const outputPath = resolve(outputDir, 'electerm-github-release.json')

if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is not set')
  process.exit(1)
}

function cleanBody (body) {
  if (!body) {
    return body
  }
  return body.replace(/[\r\n]+-{3,}[\r\n]+Download下载: \[https:\/\/electerm\.org\]\(https:\/\/electerm\.org\)\s*$/, '')
}

function slimAsset (asset = {}) {
  return {
    name: asset.name,
    browser_download_url: asset.browser_download_url,
    size: asset.size,
    created_at: asset.created_at
  }
}

function slimRelease (data = {}) {
  return {
    tag_name: data.tag_name,
    body: cleanBody(data.body),
    published_at: data.published_at,
    assets: (data.assets || []).map(slimAsset)
  }
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
    release: slimRelease(response.data)
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

  return {
    tagName: response.data.tag_name,
    assets: (response.data.assets || []).map(slimAsset)
  }
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
  console.log('Fetching Android release info from GitHub...')
  const androidInfo = await fetchAndroidReleaseInfo()
  releaseInfo.release.assets = [...(releaseInfo.release.assets || []), ...androidInfo.assets]
  console.log('Fetching repository info from GitHub...')
  const repoInfo = await fetchRepoInfo()
  const output = { ...releaseInfo, ...repoInfo, androidVersion: androidInfo.tagName }
  // Write to file
  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2))
  console.log(`Release info saved to ${outputPath}`)
}

main()
