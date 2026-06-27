let seed;
const state = { puzzle: null, marks: new Map(), dragging: false };
const categoryLabels = {characters:'Customers', bouquets:'Flowers', locations:'Places', treats:'Treats', seafoodDishes:'Seafood', generalFoods:'Foods', drinks:'Drinks', ribbons:'Ribbons', occasions:'Occasions', feelings:'Feelings', deliveryTimes:'Delivery times'};
const actions = {bouquets:'ordered', treats:'ordered', seafoodDishes:'ordered', generalFoods:'ordered', drinks:'ordered', ribbons:'chose the', occasions:'sent flowers for', feelings:'feels', deliveryTimes:'scheduled', locations:'visits'};
const negativeActions = {bouquets:'did not order', treats:'did not order', seafoodDishes:'did not order', generalFoods:'did not order', drinks:'did not order', ribbons:'did not choose', occasions:'did not send flowers for', feelings:'does not feel', deliveryTimes:'did not schedule', locations:'does not visit'};
const attrEmoji = {country:'🏳️', continent:'🗺️', texture:'🧸', hobby:'🎨', likes:'💖', dislikesOrFears:'🙀', colors:'🎨', scent:'👃', catSafety:'🐈', inside:'🚪', wetness:'💧', noise:'🔊', light:'💡', temperature:'🌡️', elevation:'⛰️', distance:'📍', tags:'🏷️'};
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const itemName = item => `${item.emoji ? item.emoji + ' ' : ''}${item.name || item}`;

function flag(country){
  const map = {Argentina:'AR', Australia:'AU', Bahamas:'BS', Brazil:'BR', Canada:'CA', China:'CN', 'Costa Rica':'CR', Denmark:'DK', Finland:'FI', France:'FR', Germany:'DE', Greece:'GR', Iceland:'IS', India:'IN', Indonesia:'ID', Ireland:'IE', Japan:'JP', Kenya:'KE', Mexico:'MX', Mongolia:'MN', Morocco:'MA', Nepal:'NP', 'New Zealand':'NZ', Peru:'PE', Rwanda:'RW', Scotland:'GB', Slovenia:'SI', 'South Africa':'ZA', Spain:'ES', Switzerland:'CH', Syria:'SY', Tanzania:'TZ', Thailand:'TH', 'Türkiye':'TR', Uganda:'UG', 'United Kingdom':'GB', 'United States':'US', Wales:'GB'};
  const code = map[country];
  return code ? code.replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt())) : '🏳️';
}
function poolItems(key){
  if(key === 'characters') return seed.characters.map(c => ({...c, category:key, emoji:`${c.emoji} ${flag(c.country)}`}));
  if(key === 'bouquets') return seed.flowers.map(f => ({...f, category:key}));
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
  const puzzle = {cats, characters, solution};
  puzzle.clues = makeMinimalClues(puzzle);
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
  const other = flower ? (flower === a ? b : a) : b;
  const subject = flower ? `The customer who ordered ${itemName(flower)}` : `The same customer`;
  const predicate = positive ? `${verb(other.category)} ${itemName(other)}` : `${negativeActions[other.category]} ${itemName(other)}`;
  return `${subject} ${predicate}.`;
}
function valuesFor(item, attr){ const v=item[attr]; return Array.isArray(v)?v:[v]; }
function attrClueText(ch, cat, attr, value){
  const phrase = cat.key === 'bouquets' ? `ordered a flower with ${attrEmoji[attr] || '🏷️'} ${value}` : `${verb(cat.key)} something with ${attrEmoji[attr] || '🏷️'} ${value}`;
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
function makeCandidateClues(puzzle){
  const clues = [];
  const cats = puzzle.cats;
  cats.slice(1).forEach(cat => puzzle.characters.forEach(ch => {
    const target = puzzle.solution[ch.id][cat.key];
    clues.push({text:relationText(ch,target,true), cats:[cat.key], test:s => s[ch.id][cat.key] === target.id, kind:'direct'});
    cat.items.filter(i => i.id !== target.id).forEach(item => clues.push({text:relationText(ch,item,false), cats:[cat.key], test:s => s[ch.id][cat.key] !== item.id, kind:'negative'}));
    activeSharedAttributes(cat).forEach(({attr,value}) => {
      if(valuesFor(target, attr).includes(value)) clues.push({text:attrClueText(ch, cat, attr, value), cats:[cat.key], test:s => valuesFor(findById(cat, s[ch.id][cat.key]), attr).includes(value), kind:'attribute'});
    });
  }));
  cats.slice(1).forEach((aCat, i) => cats.slice(i+2).forEach(bCat => {
    aCat.items.forEach(a => bCat.items.forEach(b => {
      const yes = paired(puzzle,a,b);
      clues.push({text:relationText(a,b,yes), cats:[aCat.key,bCat.key], test:s => {
        const ca = Object.keys(s).find(ch => s[ch][a.category] === a.id);
        const cb = Object.keys(s).find(ch => s[ch][b.category] === b.id);
        return yes ? ca === cb : ca !== cb;
      }, kind:yes?'cross':'negative'});
    }));
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
  const candidates = makeCandidateClues(puzzle);
  const preferred = candidates.sort((a,b)=>({attribute:0,cross:1,direct:2,negative:3}[a.kind]-{attribute:0,cross:1,direct:2,negative:3}[b.kind]));
  for(const clue of preferred){ chosen.push(clue); if(countSolutions(puzzle, chosen) === 1) break; }
  for(let i=chosen.length-1;i>=0;i--){ const trial = chosen.filter((_,j)=>j!==i); if(countSolutions(puzzle, trial) === 1) chosen.splice(i,1); }
  return chosen.map(c=>c.text);
}
function key(a,b){ return [a.id,b.id].sort().join('|'); }
function setMark(a,b,val){ state.marks.set(key(a,b), val); }
function getMark(a,b){ return state.marks.get(key(a,b)) || ''; }
function isCorrectPair(a,b){ return paired(state.puzzle,a,b); }
function render(){ renderCards(); renderClues(); renderGrid(); document.getElementById('celebration').classList.add('hidden'); }
function renderCards(){
  document.getElementById('order-cards').innerHTML = state.puzzle.characters.map(c => `<article class="order-card"><strong>${itemName(c)}</strong><div><span class="tag">${flag(c.country)} ${c.country}</span><span class="tag">${c.heightDisplay}</span><span class="tag">💖 ${c.likes.join(' & ')}</span><span class="tag">🎨 ${c.hobby}</span></div></article>`).join('');
}
function renderClues(){ document.getElementById('clues').innerHTML = state.puzzle.clues.map(c => `<li>${c}</li>`).join(''); }
function renderGrid(){
  document.getElementById('grid-board').innerHTML = gridPairs(state.puzzle.cats).map(([rowCat,colCat]) => matrix(rowCat,colCat)).join('');
  document.querySelectorAll('.cell').forEach(cell => {
    const a = findItem(cell.dataset.a), b = findItem(cell.dataset.b);
    const sync = val => { cell.textContent = val === 'yes' ? '✓' : val === 'x' ? '×' : ''; cell.className = `cell ${val}`; cell.setAttribute('aria-label', `${itemName(a)} and ${itemName(b)}: ${val || 'blank'}`); };
    sync(getMark(a,b));
    cell.addEventListener('click', () => { const next = { '':'x', x:'yes', yes:'' }[getMark(a,b)]; setMark(a,b,next); sync(next); });
    cell.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter'){ e.preventDefault(); cell.click(); } });
    cell.addEventListener('pointerdown', e => { state.dragging = true; cell.setPointerCapture(e.pointerId); });
    cell.addEventListener('pointerenter', () => { if(state.dragging && !getMark(a,b)){ setMark(a,b,'x'); sync('x'); } });
    cell.addEventListener('pointerup', () => state.dragging = false);
  });
}
function gridPairs(cats){
  const chars = cats.find(c=>c.key==='characters'), flowers = cats.find(c=>c.key==='bouquets'), others = cats.filter(c=>!['characters','bouquets'].includes(c.key));
  return [[flowers, chars], ...others.map(c=>[c, chars]), ...others.map(c=>[flowers, c]), ...others.flatMap((a,i)=>others.slice(i+1).map(b=>[a,b]))];
}
function matrix(rowCat,colCat){
  return `<section class="matrix"><h3>${rowCat.label} × ${colCat.label}</h3><table><thead><tr><th></th>${colCat.items.map(i=>`<th>${itemName(i)}</th>`).join('')}</tr></thead><tbody>${rowCat.items.map(r=>`<tr><th class="rowhead">${itemName(r)}</th>${colCat.items.map(c=>`<td class="cell" tabindex="0" role="button" data-a="${r.id}" data-b="${c.id}"></td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
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
async function init(){
  seed = await fetch('kitty_flower_shoppe_content_seed.json').then(r => r.json());
  const customerCount = document.getElementById('customer-count');
  const categoryCount = document.getElementById('category-count');
  document.getElementById('new-game-form').addEventListener('submit', e => { e.preventDefault(); state.marks.clear(); state.puzzle = newPuzzle(+customerCount.value, +categoryCount.value); render(); setStatus(`New puzzle ready with ${state.puzzle.clues.length} minimal clues.`); });
  document.getElementById('auto-fill').addEventListener('click', autoFill);
  document.getElementById('check').addEventListener('click', check);
  document.getElementById('reveal').addEventListener('click', reveal);
  state.puzzle = newPuzzle(4,3); render(); setStatus(`Puzzle ready with ${state.puzzle.clues.length} minimal clues.`);
}
init().catch(() => setStatus('Could not load the flower shoppe content seed.'));
