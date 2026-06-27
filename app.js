let seed;
const state = { puzzle: null, marks: new Map(), dragging: false, clueIndex: 0 };
const categoryLabels = {characters:'Customers', bouquets:'Flowers', locations:'Places', treats:'Treats', seafoodDishes:'Seafood', generalFoods:'Foods', drinks:'Drinks', ribbons:'Ribbons', occasions:'Occasions', feelings:'Feelings', deliveryTimes:'Delivery times'};
const actions = {bouquets:'ordered', treats:'ordered', seafoodDishes:'ordered', generalFoods:'ordered', drinks:'ordered', ribbons:'chose the', occasions:'sent flowers for', feelings:'feels', deliveryTimes:'scheduled', locations:'visits'};
const negativeActions = {bouquets:'did not order', treats:'did not order', seafoodDishes:'did not order', generalFoods:'did not order', drinks:'did not order', ribbons:'did not choose', occasions:'did not send flowers for', feelings:'does not feel', deliveryTimes:'did not schedule', locations:'does not visit'};
const attrEmoji = {country:'🏳️', continent:'🗺️', texture:'🧸', hobby:'🎨', likes:'💖', dislikesOrFears:'🙀', colors:'🎨', scent:'👃', catSafety:'🐈', inside:'🚪', wetness:'💧', noise:'🔊', light:'💡', temperature:'🌡️', elevation:'⛰️', distance:'📍', tags:'🏷️'};
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const itemText = item => `${item.emoji ? item.emoji + ' ' : ''}${item.name || item}`;
const emojiCode = emoji => [...emoji].filter(ch => ch !== '\ufe0f').map(ch => ch.codePointAt(0).toString(16)).join('_');
const emojiMarkup = emoji => String(emoji || '').split(/\s+/).filter(Boolean).map(part => `<img class="noto-emoji" src="https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/png/128/emoji_u${emojiCode(part)}.png" alt="${part}" loading="lazy" decoding="async">`).join('');
const itemName = item => `${item.emoji ? emojiMarkup(item.emoji) + ' ' : ''}${item.name || item}`;
const factEmoji = emoji => emojiMarkup(emoji);
const flowerEmojiColors = {rose:['red','green'], tulip:['pink','green'], daisy:['white','yellow'], sunflower:['yellow','brown','green'], hyacinth:['purple','green'], hibiscus:['pink','yellow','green'], lotus:['pink','green'], marigold:['orange','yellow']};
const categoryEmoji = {characters:'🐱', bouquets:'💐', locations:'📍', treats:'🍬', seafoodDishes:'🍣', generalFoods:'🍽️', drinks:'🧃', ribbons:'🎀', occasions:'🎉', feelings:'😊', deliveryTimes:'🕒'};
const firstEmoji = item => String(item.emoji || '').split(/\s+/).filter(Boolean)[0] || '❔';
const gridLabel = item => emojiMarkup(firstEmoji(item));
const categoryGridLabel = key => emojiMarkup(categoryEmoji[key] || '🏷️');

function flag(country){
  const map = {Argentina:'AR', Australia:'AU', Bahamas:'BS', Brazil:'BR', Canada:'CA', China:'CN', 'Costa Rica':'CR', Denmark:'DK', Finland:'FI', France:'FR', Germany:'DE', Greece:'GR', Iceland:'IS', India:'IN', Indonesia:'ID', Ireland:'IE', Japan:'JP', Kenya:'KE', Mexico:'MX', Mongolia:'MN', Morocco:'MA', Nepal:'NP', 'New Zealand':'NZ', Peru:'PE', Rwanda:'RW', Scotland:'GB', Slovenia:'SI', 'South Africa':'ZA', Spain:'ES', Switzerland:'CH', Syria:'SY', Tanzania:'TZ', Thailand:'TH', 'Türkiye':'TR', Uganda:'UG', 'United Kingdom':'GB', 'United States':'US', Wales:'GB'};
  const code = map[country];
  return code ? code.replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt())) : '🏳️';
}
function poolItems(key){
  if(key === 'characters') return seed.characters.map(c => ({...c, category:key, emoji:`${c.emoji} ${flag(c.country)}`}));
  if(key === 'bouquets') return seed.flowers.map(f => ({...f, colors: flowerEmojiColors[f.id] || f.colors, category:key}));
  if(key === 'locations') return seed.locations.map(l => ({...l, category:key}));
  return seed.categoryPools[key].map((label, i) => {
    const parts = String(label).split(' ');
    return {id:`${key}-${i}-${label.toLowerCase().replace(/\W+/g,'-')}`, name:parts.slice(1).join(' ') || label, emoji:parts[0], category:key};
  });
}
function newPuzzle(customerCount, categoryCount){
  const extraKeys = shuffle(['locations', ...Object.keys(seed.categoryPools)]).slice(0, categoryCount - 2);
  const cats = ['characters','bouquets',...extraKeys].map(key => ({key, label: categoryLabels[key] || key, items: shuffle(poolItems(key)).slice(0, customerCount)}));
  const characters = cats[0].items;
  const solution = {};
  cats.slice(1).forEach(cat => {
    const assigned = shuffle(cat.items);
    characters.forEach((character, i) => { (solution[character.id] ||= {})[cat.key] = assigned[i]; });
  });
  const puzzle = {cats, characters, solution, usedAttributes: new Map()};
  const minimal = makeMinimalClues(puzzle);
  puzzle.clues = minimal.texts;
  puzzle.usedAttributes = minimal.usedAttributes;
  return puzzle;
}
function ownerOf(puzzle, item){ return puzzle.characters.find(ch => puzzle.solution[ch.id][item.category]?.id === item.id); }
function paired(puzzle, a, b){
  const ch = a.category === 'characters' ? a : b.category === 'characters' ? b : null;
  if(ch){ const other = ch === a ? b : a; return puzzle.solution[ch.id]?.[other.category]?.id === other.id; }
  return ownerOf(puzzle, a)?.id === ownerOf(puzzle, b)?.id;
}
function verb(catKey){ return actions[catKey] || 'has'; }
function relationText(a,b,positive=true){
  const ch = a.category === 'characters' ? a : b.category === 'characters' ? b : null;
  if(ch){ const other = ch === a ? b : a; return `${itemName(ch)} ${positive ? verb(other.category) : negativeActions[other.category]} ${itemName(other)}.`; }
  const flower = a.category === 'bouquets' ? a : b.category === 'bouquets' ? b : null;
  const anchor = flower || a;
  const other = anchor === a ? b : a;
  const subject = `The customer who ${verb(anchor.category)} ${itemName(anchor)}`;
  const predicate = positive ? `${verb(other.category)} ${itemName(other)}` : `${negativeActions[other.category]} ${itemName(other)}`;
  return `${subject} ${predicate}.`;
}
function valuesFor(item, attr){ const v=item[attr]; return Array.isArray(v)?v:[v]; }
function attrClueText(ch, cat, attr, value){
  const phrase = cat.key === 'bouquets' ? `ordered a flower with ${factEmoji(attrEmoji[attr] || '🏷️')} ${value}` : `${verb(cat.key)} something with ${factEmoji(attrEmoji[attr] || '🏷️')} ${value}`;
  return `${itemName(ch)} ${phrase}.`;
}
function activeSharedAttributes(cat){
  const attrs = ['country','continent','texture','hobby','likes','dislikesOrFears','colors','scent','catSafety','inside','wetness','noise','light','temperature','elevation','distance','tags'];
  return attrs.flatMap(attr => {
    if(!cat.items.every(i => i[attr] !== undefined)) return [];
    const counts = new Map();
    cat.items.forEach(i => valuesFor(i, attr).forEach(v => counts.set(v, (counts.get(v)||0)+1)));
    return [...counts].filter(([,n]) => n >= 2 && n < cat.items.length).map(([value]) => ({attr,value}));
  });
}

function customerAttributePhrase(attr, value){
  if(attr === 'country') return `from ${factEmoji(attrEmoji[attr])} ${value}`;
  if(attr === 'continent') return `from ${factEmoji(attrEmoji[attr])} ${value}`;
  if(attr === 'texture') return `with ${factEmoji(attrEmoji[attr])} ${value} texture`;
  if(attr === 'likes') return `who likes ${factEmoji(attrEmoji[attr])} ${value}`;
  if(attr === 'dislikesOrFears') return `who fears ${factEmoji(attrEmoji[attr])} ${value}`;
  if(attr === 'hobby') return `whose hobby is ${factEmoji(attrEmoji[attr])} ${value}`;
  return `with ${factEmoji(attrEmoji[attr] || '🏷️')} ${attr} ${value}`;
}
function makeCandidateClues(puzzle){
  const clues = [];
  const cats = puzzle.cats;
  cats.slice(1).forEach(cat => puzzle.characters.forEach(ch => {
    const target = puzzle.solution[ch.id][cat.key];
    clues.push({text:relationText(ch,target,true), cats:[cat.key], entities:[ch.id,target.id], test:s => s[ch.id][cat.key] === target.id, kind:'direct', positive:true, directCategory:cat.key});
    cat.items.filter(i => i.id !== target.id).forEach(item => clues.push({text:relationText(ch,item,false), cats:[cat.key], entities:[ch.id,item.id], test:s => s[ch.id][cat.key] !== item.id, kind:'negative', positive:false}));
    activeSharedAttributes(cat).forEach(({attr,value}) => {
      if(valuesFor(target, attr).includes(value)) clues.push({text:attrClueText(ch, cat, attr, value), cats:[cat.key], entities:[ch.id, `${cat.key}:${attr}:${value}`], attr, category:cat.key, test:s => valuesFor(findById(cat, s[ch.id][cat.key]), attr).includes(value), kind:'categorical', positive:true});
    });
  }));
  cats.slice(1).forEach((aCat, i) => cats.slice(i+2).forEach(bCat => {
    aCat.items.forEach(a => bCat.items.forEach(b => {
      const yes = paired(puzzle,a,b);
      clues.push({text:relationText(a,b,yes), cats:[aCat.key,bCat.key], entities:[a.id,b.id], test:s => {
        const ca = Object.keys(s).find(ch => s[ch][a.category] === a.id);
        const cb = Object.keys(s).find(ch => s[ch][b.category] === b.id);
        return yes ? ca === cb : ca !== cb;
      }, kind:yes?'cross':'negative', positive:yes});
    }));
  }));

  const charCat = cats[0];
  cats.slice(1).forEach(cat => activeSharedAttributes(charCat).forEach(({attr,value}) => {
    const matchingCustomers = puzzle.characters.filter(ch => valuesFor(ch, attr).includes(value));
    if(!matchingCustomers.length || matchingCustomers.length === puzzle.characters.length) return;
    cat.items.forEach(item => {
      const anyMatch = matchingCustomers.some(ch => puzzle.solution[ch.id][cat.key].id === item.id);
      if(anyMatch){
        clues.push({text:`A customer ${customerAttributePhrase(attr, value)} ${verb(cat.key)} ${itemName(item)}.`, cats:[cat.key], entities:[`${attr}:${value}`, item.id], attr, category:'characters', test:s => matchingCustomers.some(ch => s[ch.id][cat.key] === item.id), kind:'categorical', positive:true});
      } else {
        clues.push({text:`No customer ${customerAttributePhrase(attr, value)} ${verb(cat.key)} ${itemName(item)}.`, cats:[cat.key], entities:[`${attr}:${value}`, item.id], attr, category:'characters', test:s => matchingCustomers.every(ch => s[ch.id][cat.key] !== item.id), kind:'categorical', positive:false});
      }
    });
  }));
  return shuffle(clues);
}
function findById(cat,id){ return cat.items.find(i=>i.id===id); }
function permutations(arr){ if(arr.length<2) return [arr]; return arr.flatMap((v,i)=>permutations(arr.filter((_,j)=>i!==j)).map(p=>[v,...p])); }
function countSolutions(puzzle, clues, stop=2){
  const ids = puzzle.characters.map(c=>c.id);
  const cats = puzzle.cats.slice(1);
  const permsByCat = cats.map(cat => permutations(cat.items.map(i=>i.id)));
  let n = 0;
  function walk(index, partial, assigned){
    if(n >= stop) return;
    if(index === cats.length){ n++; return; }
    const cat = cats[index];
    for(const perm of permsByCat[index]){
      const next = {...partial};
      ids.forEach((id,i) => { next[id] = {...(next[id] || {}), [cat.key]: perm[i]}; });
      const nextAssigned = new Set([...assigned, cat.key]);
      if(clues.some(c => c.cats.every(k => nextAssigned.has(k)) && !c.test(next))) continue;
      walk(index + 1, next, nextAssigned);
      if(n >= stop) return;
    }
  }
  walk(0, {}, new Set());
  return n;
}
function makeMinimalClues(puzzle){
  const chosen = [];
  const required = new Set();
  const candidates = makeCandidateClues(puzzle);
  const add = clue => { if(clue && !chosen.includes(clue)){ chosen.push(clue); return true; } return false; };
  const require = clue => { if(add(clue)) required.add(clue); };
  require(candidates.find(c => c.kind === 'categorical'));
  require(candidates.find(c => c.kind === 'negative'));
  require(candidates.find(c => c.positive));
  puzzle.cats.slice(1).forEach((aCat, i) => puzzle.cats.slice(i+2).forEach(bCat => {
    require(candidates.find(c => c.kind === 'cross' && c.cats.includes(aCat.key) && c.cats.includes(bCat.key)));
  }));
  const available = candidates.filter(c => !chosen.includes(c));
  while(countSolutions(puzzle, chosen) !== 1 && available.length){
    available.sort((a,b) => clueScore(a, chosen) - clueScore(b, chosen));
    chosen.push(available.shift());
  }
  for(let i=chosen.length-1;i>=0;i--){
    if(required.has(chosen[i])) continue;
    const trial = chosen.filter((_,j)=>j!==i);
    if(countSolutions(puzzle, trial) === 1) chosen.splice(i,1);
  }
  for(let i=chosen.length-1;i>=0;i--){
    if(required.has(chosen[i]) || chosen[i].directCategory !== 'bouquets') continue;
    const directBouquets = chosen.filter(c => c.directCategory === 'bouquets');
    if(directBouquets.length <= 1) break;
    const trial = chosen.filter((_,j)=>j!==i);
    if(countSolutions(puzzle, trial) === 1) chosen.splice(i,1);
  }
  const ordered = orderClues(chosen);
  const usedAttributes = new Map();
  ordered.filter(c => c.kind === 'categorical' && c.attr).forEach(c => {
    const attrs = usedAttributes.get(c.category) || new Set();
    attrs.add(c.attr);
    usedAttributes.set(c.category, attrs);
  });
  return {texts: ordered.map(c=>c.text), usedAttributes};
}
function clueScore(clue, chosen){
  const recent = chosen.slice(-2);
  const kindPenalty = recent.some(c => c.kind === clue.kind) ? 8 : 0;
  const entityPenalty = recent.reduce((n,c) => n + (c.entities || []).filter(e => (clue.entities || []).includes(e)).length, 0) * 6;
  const directPenalty = clue.kind === 'direct' ? 12 : 0;
  const flowerDirectPenalty = clue.directCategory === 'bouquets' ? 18 : 0;
  const kindBonus = clue.kind === 'categorical' ? -6 : clue.kind === 'cross' ? -4 : clue.kind === 'negative' ? -2 : 0;
  return kindPenalty + entityPenalty + directPenalty + flowerDirectPenalty + kindBonus + Math.random();
}
function orderClues(clues){
  const remaining = [...clues];
  const ordered = [];
  while(remaining.length){
    remaining.sort((a,b) => clueScore(a, ordered) - clueScore(b, ordered));
    ordered.push(remaining.shift());
  }
  return ordered;
}
function key(a,b){ return [a.id,b.id].sort().join('|'); }
function setMark(a,b,val){ state.marks.set(key(a,b), val); }
function getMark(a,b){ return state.marks.get(key(a,b)) || ''; }
function isCorrectPair(a,b){ return paired(state.puzzle,a,b); }
function render(){ renderCards(); renderCatalog(); renderClues(); renderGrid(); document.getElementById('celebration').classList.add('hidden'); }
function renderCards(){
  document.getElementById('order-cards').innerHTML = state.puzzle.characters.map(c => `<article class="order-card"><strong>${itemName(c)}</strong><div>${describeCustomer(c).map(t => `<span class="tag">${t}</span>`).join('')}</div></article>`).join('');
}
function describeCustomer(customer){
  const baseAttrs = ['country','heightDisplay','likes','hobby'];
  const clueAttrs = [...(state.puzzle.usedAttributes.get('characters') || [])];
  return [...new Set([...baseAttrs, ...clueAttrs])].filter(attr => customer[attr] !== undefined).map(attr => {
    if(attr === 'heightDisplay') return customer.heightDisplay;
    const value = valuesFor(customer, attr).join(', ');
    if(attr === 'country') return `${factEmoji(flag(customer.country))} ${customer.country}`;
    return `${factEmoji(attrEmoji[attr] || '🏷️')} ${attr}: ${value}`;
  });
}
function renderCatalog(){
  const catalog = document.getElementById('category-cards');
  catalog.innerHTML = state.puzzle.cats.slice(1).map(cat => `<section class="category-card"><h3>${cat.label}</h3>${cat.items.map(item => `<article><strong>${itemName(item)}</strong><div>${describeItem(item, cat).map(t => `<span class="tag">${t}</span>`).join('')}</div></article>`).join('')}</section>`).join('');
}
function describeItem(item, cat){
  const baseAttrs = cat.key === 'bouquets' ? ['colors','scent','catSafety','pricePerStem'] : cat.key === 'locations' ? ['inside','wetness','noise','light','temperature','elevation','distance','tags'] : [];
  const clueAttrs = [...(state.puzzle.usedAttributes.get(cat.key) || [])];
  return [...new Set([...baseAttrs, ...clueAttrs])].filter(attr => item[attr] !== undefined).map(attr => {
    const value = valuesFor(item, attr).join(', ');
    return typeof item[attr] === 'number' ? `${attr}: ${value}` : `${factEmoji(attrEmoji[attr] || '🏷️')} ${attr}: ${value}`;
  });
}
function renderClues(){
  state.clueIndex = Math.min(state.clueIndex, state.puzzle.clues.length - 1);
  const clue = state.puzzle.clues[state.clueIndex];
  document.getElementById('clues').innerHTML = `<div class="clue-card"><p class="clue-count">Clue ${state.clueIndex + 1} of ${state.puzzle.clues.length}</p><p>${clue}</p><div class="clue-nav"><button type="button" id="prev-clue">Previous</button><button type="button" id="next-clue">Next</button></div></div>`;
  document.getElementById('prev-clue').disabled = state.clueIndex === 0;
  document.getElementById('next-clue').disabled = state.clueIndex === state.puzzle.clues.length - 1;
  document.getElementById('prev-clue').addEventListener('click', () => { state.clueIndex--; renderClues(); });
  document.getElementById('next-clue').addEventListener('click', () => { state.clueIndex++; renderClues(); });
}
function renderGrid(){
  document.getElementById('grid-board').innerHTML = continuousGrid(state.puzzle.cats);
  document.querySelectorAll('.cell').forEach(cell => {
    const a = findItem(cell.dataset.a), b = findItem(cell.dataset.b);
    const sync = val => { cell.textContent = val === 'yes' ? '✓' : val === 'x' ? '×' : ''; cell.className = `cell ${val}`; cell.setAttribute('aria-label', `${itemText(a)} and ${itemText(b)}: ${val || 'blank'}`); };
    sync(getMark(a,b));
    cell.addEventListener('click', () => { const next = { '':'x', x:'yes', yes:'' }[getMark(a,b)]; setMark(a,b,next); sync(next); });
    cell.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter'){ e.preventDefault(); cell.click(); } });
    cell.addEventListener('pointerdown', e => { state.dragging = true; cell.setPointerCapture(e.pointerId); });
    cell.addEventListener('pointerenter', () => { if(state.dragging && !getMark(a,b)){ setMark(a,b,'x'); sync('x'); } });
    cell.addEventListener('pointerup', () => state.dragging = false);
  });
}

function sectionKey(a,b){ return [a.key,b.key].sort().join('|'); }
function isActiveGridPair(rowCat, colCat, others){
  const rowOtherIndex = others.findIndex(c => c.key === rowCat.key);
  const colOtherIndex = others.findIndex(c => c.key === colCat.key);
  return rowCat.key !== colCat.key && (rowCat.key === 'bouquets' || colCat.key === 'characters' || colOtherIndex > rowOtherIndex);
}
function sectionClasses(rowCats, colCats, others){
  const classes = new Map();
  let sectionIndex = 0;
  rowCats.forEach(rowCat => colCats.forEach(colCat => {
    if(!isActiveGridPair(rowCat, colCat, others)) return;
    classes.set(sectionKey(rowCat, colCat), sectionIndex % 2 === 0 ? 'section-purple' : 'section-white');
    sectionIndex++;
  }));
  return classes;
}
function continuousGrid(cats){
  const chars = cats.find(c=>c.key==='characters');
  const flowers = cats.find(c=>c.key==='bouquets');
  const others = cats.filter(c=>!['characters','bouquets'].includes(c.key));
  const colCats = [chars, ...others];
  const rowCats = [flowers, ...others];
  const sectionClassMap = sectionClasses(rowCats, colCats, others);
  const headerGroups = `<tr><th class="corner" colspan="2"></th>${colCats.map(cat => `<th class="grouphead" colspan="${cat.items.length}" aria-label="${cat.label}">${categoryGridLabel(cat.key)}</th>`).join('')}</tr>`;
  const headers = `<tr><th class="corner" colspan="2"></th>${colCats.map(cat => cat.items.map(i => `<th aria-label="${itemText(i)}">${gridLabel(i)}</th>`).join('')).join('')}</tr>`;
  const rows = rowCats.map(rowCat => rowCat.items.map((rowItem, itemIndex) => {
    const rowHeader = itemIndex === 0 ? `<th class="rowgroup" rowspan="${rowCat.items.length}" aria-label="${rowCat.label}">${categoryGridLabel(rowCat.key)}</th>` : '';
    return `<tr>${rowHeader}<th class="rowhead" aria-label="${itemText(rowItem)}">${gridLabel(rowItem)}</th>${colCats.map(colCat => colCat.items.map(colItem => gridCell(rowCat, rowItem, colCat, colItem, others, sectionClassMap)).join('')).join('')}</tr>`;
  }).join('')).join('');
  return `<div class="continuous-grid"><table><thead>${headerGroups}${headers}</thead><tbody>${rows}</tbody></table></div>`;
}
function gridCell(rowCat, rowItem, colCat, colItem, others, sectionClassMap){
  if(!isActiveGridPair(rowCat, colCat, others)) return '<td class="blank-cell" aria-hidden="true"></td>';
  const sectionClass = sectionClassMap.get(sectionKey(rowCat, colCat)) || 'section-white';
  return `<td class="cell section-cell ${sectionClass}" tabindex="0" role="button" data-a="${rowItem.id}" data-b="${colItem.id}"></td>`;
}

function findItem(id){ return state.puzzle.cats.flatMap(c=>c.items).find(i=>i.id===id); }
function autoFill(){
  const yesPairs = [...state.marks.entries()].filter(([,v])=>v==='yes').map(([k])=>k.split('|'));
  yesPairs.forEach(([id1,id2]) => {
    const a=findItem(id1), b=findItem(id2); if(!a||!b) return;
    state.puzzle.cats.forEach(cat => cat.items.forEach(i => {
      if(i.category===a.category && i.id!==a.id && b.category!==a.category) setMark(i,b,'x');
      if(i.category===b.category && i.id!==b.id && a.category!==b.category) setMark(a,i,'x');
    }));
  });
  renderGrid(); setStatus('Auto-fill marked Xs in rows and columns with a ✓.');
}
function check(){
  const wrong = [...state.marks.entries()].some(([k,v]) => v==='yes' && !isCorrectPair(...k.split('|').map(findItem)));
  if(wrong) return setStatus('A checked match is not quite right yet.');
  const complete = state.puzzle.characters.every(ch => state.puzzle.cats.slice(1).every(cat => getMark(ch, state.puzzle.solution[ch.id][cat.key]) === 'yes'));
  complete ? celebrate() : setStatus('So far so good. Keep deducing!');
}
function reveal(){ state.puzzle.characters.forEach(ch => state.puzzle.cats.slice(1).forEach(cat => setMark(ch, state.puzzle.solution[ch.id][cat.key], 'yes'))); autoFill(); celebrate(); }
function celebrate(){
  const rows = state.puzzle.characters.map(ch => `<li>${itemName(ch)} ${state.puzzle.cats.slice(1).map(cat => `${verb(cat.key)} ${itemName(state.puzzle.solution[ch.id][cat.key])}`).join(', ')}.</li>`).join('');
  const box=document.getElementById('celebration'); box.innerHTML = `<h2>🦋 Sparkly deliveries complete! ✨</h2><ul>${rows}</ul><p>Kitty tied every bouquet with care, and the shoppe glowed with happy blooms.</p>`; box.classList.remove('hidden'); setStatus('Puzzle complete!');
}
function setStatus(msg){ document.getElementById('status').textContent = msg; }

function setupKitty(){
  const kitty = document.getElementById('kitty-runner');
  kitty.innerHTML = emojiMarkup('🐱');
  const moveKitty = event => {
    if(!event.isPrimary && event.pointerType) return;
    const x = Math.max(22, Math.min(window.innerWidth - 22, event.clientX));
    const y = Math.max(22, Math.min(window.innerHeight - 22, event.clientY));
    kitty.classList.add('running');
    kitty.style.left = `${x}px`;
    kitty.style.top = `${y}px`;
    window.clearTimeout(kitty._settleTimer);
    kitty._settleTimer = window.setTimeout(() => kitty.classList.remove('running'), 280);
  };
  document.addEventListener('pointerdown', moveKitty, {passive:true});
}
async function init(){
  setupKitty();
  seed = await fetch('kitty_flower_shoppe_content_seed.json').then(r => r.json());
  const customerCount = document.getElementById('customer-count');
  const categoryCount = document.getElementById('category-count');
  document.getElementById('new-game-form').addEventListener('submit', e => { e.preventDefault(); state.marks.clear(); state.clueIndex = 0; state.puzzle = newPuzzle(+customerCount.value, +categoryCount.value); render(); setStatus(`New puzzle ready with ${state.puzzle.clues.length} minimal clues.`); });
  document.getElementById('auto-fill').addEventListener('click', autoFill);
  document.getElementById('check').addEventListener('click', check);
  document.getElementById('reveal').addEventListener('click', reveal);
  state.puzzle = newPuzzle(4,3); render(); setStatus(`Puzzle ready with ${state.puzzle.clues.length} minimal clues.`);
}
init().catch(() => setStatus('Could not load the flower shoppe content seed.'));
