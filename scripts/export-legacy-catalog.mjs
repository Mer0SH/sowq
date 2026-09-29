// One-time export for migrating the original storefront fixtures into SQLite.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function readModule(file) {
  const source = fs.readFileSync(file, 'utf8')
    .replace(/^import chairOdin.*\r?\n/m, "const chairOdin = '/media/chair-leather-cutout-pexels-11112734.png';\n")
    .replace(/^import chairSienna.*\r?\n/m, "const chairSienna = '/media/seed-chair-sienna.png';\n");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', javascript)(exports);
  return exports;
}

const categories = readModule('src/data/categories.ts').seedCategories;
const products = readModule('src/data/products.ts').products;
const destination = process.argv[2];
if (!destination) throw new Error('Provide an output JSON path');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify({ categories, products }, null, 2));
console.log(`Exported ${categories.length} categories and ${products.length} products`);
