const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

module.exports = {
  entry: './src/renderer.tsx',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
};
