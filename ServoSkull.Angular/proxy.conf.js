module.exports = {
    // Forward all requests to `http://localhost:4200/api`, to `http[s]://localhost:{PORT}/`
    '/api': {
      target: process.env['services__apiservice__https__0'] || process.env['services__apiservice__http__0'],
      secure: process.env["NODE_ENV"] !== "development",
      pathRewrite: {
        '^/api': '',
      },
    },
  };