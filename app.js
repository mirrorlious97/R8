const CET6_WORDS = new Set([
  'region', 'terrorist', 'resolution', 'targeting', 'sponsor', 'signaling', 'measure', 'unwillingness'
]);
const KY_WORDS = new Set([
  'unclear', 'unanimous', 'chambers', 'praised', 'back', 'support'
]);

const miniDict = {
  unclear: '不清楚的', region: '地区', terrorist: '恐怖主义者',
  resolution: '决议', unanimous: '全体一致的', chambers: '两院',
  praised: '赞扬', measure: '举措', support: '支持'
};

const input = document.getElementById('input');
const renderBtn = document.getElementById('renderBtn');
const reader = document.getElementById('reader');

function tokenize(text) {
  return text.split(/(\b)/);
}

function highlightParagraph(text) {
  return tokenize(text).map(tok => {
    const lower = tok.toLowerCase().replace(/[^a-z]/g, '');
    if (!lower) return tok;
    if (KY_WORDS.has(lower)) return `<span class="word ky" title="考研词汇">${tok}</span>`;
    if (CET6_WORDS.has(lower)) return `<span class="word cet6" title="六级词汇">${tok}</span>`;
    return tok;
  }).join('');
}

function pseudoTranslate(text) {
  return text
    .split(/\s+/)
    .map(w => {
      const key = w.toLowerCase().replace(/[^a-z]/g, '');
      return miniDict[key] ? `${w}(${miniDict[key]})` : w;
    })
    .join(' ');
}

async function requestTranslation(paragraph) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paragraph })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'translation failed');
  }
  return `${data.translation}（模型：${data.model}）`;
}

function createCard(paragraph, idx) {
  const card = document.createElement('article');
  card.className = 'paragraph-card';

  const en = document.createElement('p');
  en.className = 'en';
  en.innerHTML = highlightParagraph(paragraph);

  const btn = document.createElement('button');
  btn.className = 'trans-btn';
  btn.textContent = `查看第 ${idx + 1} 段翻译`;

  const trans = document.createElement('div');
  trans.className = 'translation';
  trans.hidden = true;

  let loaded = false;
  btn.addEventListener('click', async () => {
    if (!trans.hidden) {
      trans.hidden = true;
      btn.textContent = `查看第 ${idx + 1} 段翻译`;
      return;
    }

    trans.hidden = false;
    btn.textContent = '翻译中...';

    if (!loaded) {
      try {
        const content = await requestTranslation(paragraph);
        trans.textContent = content;
      } catch {
        trans.textContent = `模型不可用，已回退本地词典翻译：${pseudoTranslate(paragraph)}`;
      }
      loaded = true;
    }

    btn.textContent = `关闭第 ${idx + 1} 段翻译`;
  });

  card.append(en, btn, trans);
  return card;
}

function render() {
  const paragraphs = input.value
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  reader.innerHTML = '';
  if (!paragraphs.length) {
    reader.textContent = '请先粘贴文章内容。';
    return;
  }

  paragraphs.forEach((p, i) => reader.appendChild(createCard(p, i)));
}

renderBtn.addEventListener('click', render);
render();
