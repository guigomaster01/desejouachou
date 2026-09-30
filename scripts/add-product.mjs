#!/usr/bin/env node
/**
 * CLI Script para extrair dados de produto e gerar arquivo .md automaticamente.
 * Uso:
 *   node scripts/add-product.mjs "https://s.shopee.com.br/..."
 * ou
 *   npm run add "https://amazon.com.br/..."
 */

import fs from 'node:fs';
import path from 'node:path';
import { scrapeProductUrl, enrichWithAI, buildMarkdownContent, slugify } from '../src/plugins/admin-api.js';

const url = process.argv[2];

if (!url) {
  console.error('\n❌ Por favor, informe a URL do produto:');
  console.log('   npm run add "https://s.shopee.com.br/exemplo"\n');
  process.exit(1);
}

async function main() {
  console.log('\n🔍 Acessando produto:', url);
  try {
    const scraped = await scrapeProductUrl(url);
    console.log(`✅ Dados extraídos: "${scraped.title}" (${scraped.price})`);

    console.log('🤖 Gerando copywriting com IA...');
    const aiData = await enrichWithAI(scraped);

    const fullData = {
      ...scraped,
      ...aiData,
      featured: true,
      publishDate: new Date().toISOString().split('T')[0]
    };

    const slug = slugify(fullData.title).slice(0, 80);
    const filename = `${slug}.md`;
    const targetDir = path.resolve(process.cwd(), 'src/content/products');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);
    const markdown = buildMarkdownContent(fullData);

    await fs.promises.writeFile(filePath, markdown, 'utf8');

    console.log('\n🎉 Arquivo .md criado com sucesso!');
    console.log(`📁 Caminho: src/content/products/${filename}`);
    console.log(`🔗 Ver no site: http://localhost:4323/produto/${slug}\n`);
  } catch (err) {
    console.error('\n❌ Erro ao processar:', err.message);
    process.exit(1);
  }
}

main();
