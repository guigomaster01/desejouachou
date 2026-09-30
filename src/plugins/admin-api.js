import fs from 'node:fs';
import path from 'node:path';

// Clean text
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert title to URL slug
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Detect store from URL
export function detectPlatform(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('shopee')) return 'shopee';
    if (host.includes('amazon') || host.includes('amzn')) return 'amazon';
    if (host.includes('mercadolivre') || host.includes('mercadolibre')) return 'mercadolivre';
    if (host.includes('shein')) return 'shein';
    if (host.includes('aliexpress')) return 'aliexpress';
    if (host.includes('magalu') || host.includes('magazineluiza')) return 'magalu';
    return 'outros';
  } catch {
    return 'outros';
  }
}

// Clean titles from store-specific garbage
function cleanProductTitle(rawTitle, platform) {
  let title = rawTitle || '';
  title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (platform === 'shopee') {
    title = title.replace(/\s*\|\s*Shopee.*$/i, '');
  } else if (platform === 'amazon') {
    title = title.replace(/^Amazon\.com\.br:\s*/i, '');
    title = title.replace(/\s*:\s*Amazon\.com\.br.*$/i, '');
  } else if (platform === 'mercadolivre') {
    title = title.replace(/\s*\|\s*Mercado Livre.*$/i, '');
    title = title.replace(/\s*-\s*Frete gr[áa]tis.*$/i, '');
  } else if (platform === 'shein') {
    title = title.replace(/\s*\|\s*SHEIN.*$/i, '');
  }
  return cleanText(title);
}

// Format number to R$ string
function formatCurrency(val) {
  if (typeof val === 'number') {
    return 'R$ ' + val.toFixed(2).replace('.', ',');
  }
  if (!val) return '';
  const str = String(val).trim();
  if (str.startsWith('R$')) return str;
  const num = parseFloat(str.replace(/[^0-9,.]/g, '').replace(',', '.'));
  if (!isNaN(num)) {
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  }
  return str;
}

// Extract OpenGraph, Meta, and JSON-LD
export async function scrapeProductUrl(inputUrl) {
  const platform = detectPlatform(inputUrl);
  
  // Follow redirects (for shortlinks like s.shopee.com.br, amzn.to)
  const res = await fetch(inputUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  const finalUrl = res.url || inputUrl;
  const html = await res.text();

  let title = '';
  let image = '';
  let price = '';
  let originalPrice = '';
  let discount = '';
  let rating = 4.9;
  let reviewsCount = 1200;

  // 1. OpenGraph Meta Tags
  const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch) title = ogTitleMatch[1];

  const ogImageMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch) image = ogImageMatch[1];

  // Title fallback
  if (!title) {
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTagMatch) title = titleTagMatch[1];
  }

  // 2. Parse JSON-LD blocks
  const jsonLdMatches = html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ItemPage') {
          if (!title && item.name) title = item.name;
          if (!image && item.image) {
            image = Array.isArray(item.image) ? item.image[0] : (typeof item.image === 'object' ? item.image.url : item.image);
          }
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer.price) price = formatCurrency(offer.price);
            if (offer.highPrice) originalPrice = formatCurrency(offer.highPrice);
          }
          if (item.aggregateRating) {
            if (item.aggregateRating.ratingValue) rating = parseFloat(item.aggregateRating.ratingValue) || 4.9;
            if (item.aggregateRating.reviewCount) reviewsCount = parseInt(item.aggregateRating.reviewCount, 10) || 1200;
          }
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // 3. Platform specific selectors if price is still missing
  if (!price) {
    if (platform === 'amazon') {
      const whole = html.match(/class=\"a-price-whole\">([0-9.,]+)/);
      const fraction = html.match(/class=\"a-price-fraction\">([0-9]+)/);
      if (whole) {
        price = 'R$ ' + whole[1].replace(/[^0-9]/g, '') + (fraction ? ',' + fraction[1] : ',00');
      }
      const strike = html.match(/class=\"a-price a-text-price[^>]*>[^<]*<span class=\"a-offscreen\">R\$\s*([0-9.,]+)/i);
      if (strike) originalPrice = 'R$ ' + strike[1];
    } else if (platform === 'mercadolivre') {
      const mlPriceMatch = html.match(/class=\"ui-pdp-price__second-line\"[^>]*>.*?<span class=\"andes-money-amount__fraction\">([0-9.]+)/s);
      if (mlPriceMatch) price = 'R$ ' + mlPriceMatch[1] + ',00';
    }
  }

  // 4. Calculate discount if both prices exist
  if (price && originalPrice) {
    const pNum = parseFloat(price.replace(/[^0-9,]/g, '').replace(',', '.'));
    const oNum = parseFloat(originalPrice.replace(/[^0-9,]/g, '').replace(',', '.'));
    if (oNum > pNum && oNum > 0) {
      const disc = Math.round(((oNum - pNum) / oNum) * 100);
      if (disc > 0) discount = '-' + disc + '%';
    }
  }

  // Clean title
  title = cleanProductTitle(title, platform);

  return {
    title,
    image,
    price: price || 'R$ 49,90',
    originalPrice: originalPrice || '',
    discount: discount || (originalPrice ? '-25%' : ''),
    affiliateUrl: inputUrl,
    affiliatePlatform: platform,
    rating: Number(rating.toFixed(1)) || 4.9,
    reviewsCount: reviewsCount || Math.floor(Math.random() * 2500) + 800
  };
}

// Fallback AI heuristic when no Gemini API key is present
function generateFallbackCopy(product) {
  const t = (product.title || '').toLowerCase();
  
  let category = 'Casa & Cozinha';
  let badge = 'Mais Vendido';
  let badgeColor = 'purple';
  let questionTitle = 'Por que virou meu companheiro indispensável de todo dia? ✨';
  let tags = ['praticidade', 'casa', product.affiliatePlatform];

  if (t.includes('fone') || t.includes('bluetooth') || t.includes('carregador') || t.includes('led') || t.includes('lamp') || t.includes('impressora')) {
    category = 'Achados Tech';
    badge = 'Tendência Tech';
    badgeColor = 'amber';
    questionTitle = 'O achado tech que facilitou minha rotina! 🎧';
    tags = ['tech', 'bluetooth', 'gadget', product.affiliatePlatform];
  } else if (t.includes('escova') || t.includes('maquiagem') || t.includes('espelho') || t.includes('skincare') || t.includes('cabelo') || t.includes('óleo') || t.includes('creme') || t.includes('lola')) {
    category = 'Beleza & Cabelo';
    badge = 'Queridinho do Mês';
    badgeColor = 'pink';
    questionTitle = 'Por que esse item não sai mais da minha bancada de beleza? 💄';
    tags = ['beleza', 'skincare', 'autocuidado', product.affiliatePlatform];
  } else if (t.includes('organizador') || t.includes('caixa') || t.includes('suporte') || t.includes('prateleira')) {
    category = 'Organização';
    badge = 'Espaço Extra';
    badgeColor = 'emerald';
    questionTitle = 'Bancada organizada e sem bagunça em segundos! 📦';
    tags = ['organização', 'quarto', 'casa', product.affiliatePlatform];
  } else if (t.includes('bolsa') || t.includes('mochila') || t.includes('vestido') || t.includes('calçado') || t.includes('sandália')) {
    category = 'Moda & Acessórios';
    badge = 'Estilo & Conforto';
    badgeColor = 'pink';
    questionTitle = 'O toque de estilo que faltava nos meus looks! 👜';
    tags = ['moda', 'look', 'estilo', product.affiliatePlatform];
  }

  const shortDesc = `${product.title}. Qualidade excelente, design moderno e perfeito para facilitar sua rotina com o melhor custo-benefício!`.slice(0, 290);

  return {
    description: shortDesc,
    category,
    badge,
    badgeColor,
    tags,
    questionTitle,
    reviewText: `Testado e super aprovado! O produto entrega exatamente o que promete, com material de qualidade superior e acabamento impecável. É daqueles achados que a gente compra e se pergunta como viveu tanto tempo sem.`,
    positivePoints: [
      'Excelente acabamento e alta durabilidade no uso diário',
      'Custo-benefício imbatível e entrega rápida'
    ]
  };
}

// Generate texts with Gemini API
export async function enrichWithAI(product, geminiKey) {
  const apiKey = geminiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateFallbackCopy(product);
  }

  const prompt = `Você é a especialista em copywriting da loja de achadinhos virais 'Desejou Achou'.
Analise este produto:
- Título: ${product.title}
- Preço: ${product.price}
- Plataforma: ${product.affiliatePlatform}

Retorne ESTRITAMENTE um objeto JSON (sem markdown envolta, sem crases de código) com o seguinte esquema:
{
  "description": "Frase persuasiva de no máximo 280 caracteres com emojis, ideal para card de produto.",
  "category": "Escolha uma entre: 'Beleza & Cabelo', 'Casa & Cozinha', 'Moda & Acessórios', 'Organização', 'Achados Tech', 'Casa', 'Limpeza', 'Outros'",
  "badge": "Etiqueta curta de 1 a 3 palavras (ex: 'Mais Vendido', 'Queridinho do Mês', 'Achado VIP', 'Super Oferta', 'Tendência TikTok')",
  "badgeColor": "Escolha EXATAMENTE uma cor entre: 'purple', 'pink', 'amber', 'emerald', 'blue'",
  "tags": ["array", "com", "3 a 5", "tags curtas em minusculas"],
  "questionTitle": "Uma pergunta chamativa com emoji em primeira pessoa que o comprador faria (ex: 'Por que virou meu companheiro indispensável de todo dia? 💄')",
  "reviewText": "Texto de 1 a 2 parágrafos autêntico e envolvente em primeira pessoa como alguém que comprou, testou e recomenda com entusiasmo.",
  "positivePoints": ["Ponto positivo 1", "Ponto positivo 2"]
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      })
    });

    if (!res.ok) {
      console.warn('Gemini API call failed with status:', res.status);
      return generateFallbackCopy(product);
    }

    const json = await res.json();
    const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return generateFallbackCopy(product);

    const parsed = JSON.parse(candidateText);

    // Validate and enforce constraints
    let desc = cleanText(parsed.description || '');
    if (desc.length > 300) desc = desc.slice(0, 297) + '...';

    const validColors = ['purple', 'pink', 'amber', 'emerald', 'blue'];
    const badgeColor = validColors.includes(parsed.badgeColor) ? parsed.badgeColor : 'purple';

    return {
      description: desc || product.title,
      category: parsed.category || 'Casa & Cozinha',
      badge: parsed.badge || 'Mais Vendido',
      badgeColor,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(t => String(t).toLowerCase().trim()) : ['achadinho'],
      questionTitle: parsed.questionTitle || 'Por que virou meu companheiro indispensável? ✨',
      reviewText: parsed.reviewText || 'Um dos melhores achadinhos que já testei! Vale cada centavo.',
      positivePoints: Array.isArray(parsed.positivePoints) && parsed.positivePoints.length > 0 
        ? parsed.positivePoints 
        : ['Excelente acabamento', 'Prático para o dia a dia']
    };
  } catch (err) {
    console.error('Error in enrichWithAI:', err);
    return generateFallbackCopy(product);
  }
}

// Build Markdown File Content
export function buildMarkdownContent(data) {
  const safeTitle = (data.title || '').replace(/"/g, '\\"');
  const safeDesc = (data.description || '').replace(/"/g, '\\"');
  const tagsFormatted = (data.tags || []).map(t => `"${t.replace(/"/g, '')}"`).join(', ');

  const pointsList = (data.positivePoints || [])
    .map(p => `- ${p}`)
    .join('\n');

  return `---
title: "${safeTitle}"
description: "${safeDesc}"
price: "${data.price || 'R$ 0,00'}"
originalPrice: "${data.originalPrice || ''}"
discount: "${data.discount || ''}"
affiliateUrl: "${data.affiliateUrl}"
affiliatePlatform: "${(data.affiliatePlatform || 'shopee').toLowerCase()}"
category: "${data.category || 'Casa & Cozinha'}"
badge: "${data.badge || 'Destaque'}"
badgeColor: "${data.badgeColor || 'purple'}"
rating: ${Number(data.rating) || 4.9}
reviewsCount: ${Number(data.reviewsCount) || 1200}
image: "${data.image}"
featured: ${Boolean(data.featured)}
publishDate: "${data.publishDate || new Date().toISOString().split('T')[0]}"
tags: [${tagsFormatted}]
---

### ${data.questionTitle || 'Por que virou meu companheiro indispensável? ✨'}
${data.reviewText || ''}

### Pontos Positivos:
${pointsList}
`;
}

// Vite plugin to provide admin API endpoints in dev mode
export function adminApiPlugin() {
  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/admin/scrape', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { url, apiKey } = JSON.parse(body || '{}');
            if (!url) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'URL é obrigatória' }));
            }

            console.log('[Admin Scraper] Extraindo dados da URL:', url);
            const scraped = await scrapeProductUrl(url);
            console.log('[Admin Scraper] Dados extraídos:', scraped.title, scraped.price);

            console.log('[Admin Scraper] Enriquecendo com IA...');
            const aiData = await enrichWithAI(scraped, apiKey);

            const result = {
              ...scraped,
              ...aiData,
              featured: true,
              publishDate: new Date().toISOString().split('T')[0]
            };

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[Admin Scraper] Erro:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro ao extrair produto' }));
          }
        });
      });

      server.middlewares.use('/api/admin/save', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            if (!data.title || !data.affiliateUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Título e Link de Afiliado são obrigatórios' }));
            }

            const slug = (data.slug || slugify(data.title)).slice(0, 80);
            const productsDir = path.resolve(process.cwd(), 'src/content/products');
            
            if (!fs.existsSync(productsDir)) {
              fs.mkdirSync(productsDir, { recursive: true });
            }

            const filename = `${slug}.md`;
            const filePath = path.join(productsDir, filename);

            const markdown = buildMarkdownContent(data);
            await fs.promises.writeFile(filePath, markdown, 'utf8');

            console.log('[Admin API] Arquivo salvo com sucesso:', filePath);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              slug,
              filename,
              path: filePath,
              markdown
            }));
          } catch (err) {
            console.error('[Admin API] Erro ao salvar:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro ao salvar arquivo' }));
          }
        });
      });
    }
  };
}
