/**
 * Render a pug template into an HTML file.
 *
 * Pug buffers `//` comments into its output and never emits `//-` ones, so a
 * template note written with the wrong slash ends up on the live site. This
 * checks for that and fails the build — it does not rewrite the markup: a
 * regex over rendered HTML cannot reliably tell a comment from a `<script>`
 * tag quoted inside one (see the note in `src/views/parts/page-script.pug`).
 */
import fs from 'fs/promises'
import pug from 'pug'

// `<!--[if ...]>` conditional comments are functional, so they do not count.
const HTML_COMMENT = /<!--(?!\[if\b)/i

export const buildPug = async (from, to, data) => {
  const pugContent = await fs.readFile(from, 'utf8')
  const htmlContent = pug.render(pugContent, {
    filename: from,
    ...data
  })
  if (HTML_COMMENT.test(htmlContent)) {
    throw new Error(
      `${from} rendered an HTML comment. Use "//-" for template notes instead of "//" ` +
      '(pug buffers "//" into the output). Raw HTML comments in injected content ' +
      '(e.g. blog markdown) trip this too.'
    )
  }
  await fs.writeFile(to, htmlContent, 'utf8')
}
