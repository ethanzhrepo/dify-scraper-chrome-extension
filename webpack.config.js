import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'development',
  entry: {
    popup: path.resolve(__dirname, 'src/popup/popup.js'),
    content: path.resolve(__dirname, 'src/content/content.js'),
    background: path.resolve(__dirname, 'src/background/background.js'),
  },
  output: {
    filename: '[name]/[name].js',
    path: path.resolve(__dirname, 'dist'),
    module: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'src/popup/popup.html'), to: 'popup/popup.html' },
        { from: path.resolve(__dirname, 'src/assets'), to: 'assets' },
        { from: path.resolve(__dirname, 'manifest.json'), to: 'manifest.json' }
      ]
    })
  ],
  devtool: 'source-map',
  resolve: {
    extensions: ['.js'],
  },
  experiments: {
    outputModule: true,
  },
};