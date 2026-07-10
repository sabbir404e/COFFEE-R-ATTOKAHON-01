import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      'node-fetch': './src/lib/node-fetch-mock.js',
    },
  },
  webpack: (config) => {
    config.resolve.alias['node-fetch'] = path.resolve(__dirname, 'src/lib/node-fetch-mock.js');
    return config;
  }
};

export default nextConfig;
