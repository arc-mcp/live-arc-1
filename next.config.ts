import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const pagesBasePath = process.env.PAGES_BASE_PATH || '';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath ? `${pagesBasePath}/` : undefined,
  images: {
    unoptimized: true
  },
  turbopack: {
    root: projectRoot
  }
};

export default nextConfig;
