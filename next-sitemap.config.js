/** @type {import('next-sitemap').Config} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://pedi-ai.com',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' }
    ]
  }
}
