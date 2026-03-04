declare module 'mjml' {
  interface MjmlError {
    line: number
    message: string
    tagName?: string
    formattedMessage?: string
  }

  interface MjmlOptions {
    fonts?: Record<string, string>
    keepComments?: boolean
    beautify?: boolean
    minify?: boolean
    validationLevel?: 'strict' | 'soft' | 'skip'
    filePath?: string
    preprocessors?: any[]
  }

  interface MjmlResult {
    html: string
    errors: MjmlError[]
  }

  function mjml2html(mjml: string, options?: MjmlOptions): MjmlResult
  export = mjml2html
}
