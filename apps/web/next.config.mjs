export default {
  transpilePackages: ['@zhiqing/ui', '@zhiqing/content', '@zhiqing/adapters'],
  async headers(){return ['/admin/:path*','/preview/:path*','/api/:path*','/media/:path*','/sitemap.xml'].map(source=>({source,headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]}));},
  serverExternalPackages: ['payload', '@payloadcms/db-postgres', 'pg', 'sharp', 'pdf-lib'],
};
