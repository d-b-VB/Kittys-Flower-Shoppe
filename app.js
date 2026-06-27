let seed;
const state = { puzzle: null, marks: new Map(), dragging: false };
const categoryLabels = {characters:'Customers', bouquets:'Bouquets', locations:'Locations', treats:'Treats', seafoodDishes:'Seafood', generalFoods:'Snacks', drinks:'Drinks', ribbons:'Ribbons', occasions:'Occasions', feelings:'Feelings', deliveryTimes:'Delivery times'};
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const choice = arr => arr[Math.floor(Math.random() * arr.length)];
const itemName = item => `${item.emoji ? item.emoji + ' ' : ''}${item.name || item}`;

function poolItems(key){
  if(key === 'characters') return seed.characters.map(c => ({...c, category:key}));
  if(key === 'bouquets') return seed.flowers.map(f => ({...f, category:key, name:f.bouquetName || f.name}));
  if(key === 'locations') return seed.locations.map(l => typeof l === 'string' ? {id:l.toLowerCase().replaceAll(' ','-'), name:l, category:key} : {...l, category:key});
  return seed.categoryPools[key].map((name, i) => ({id:`${key}-${i}-${String(name).toLowerCase().replace(/\W+/g,'-')}`, name, category:key}));
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
  return {cats, characters, solution, clues: makeClues(cats, characters, solution)};
}
function makeClues(cats, characters, solution){
  const clues = [];
  cats.slice(1).forEach(cat => characters.forEach(ch => {
    const target = solution[ch.id][cat.key];
    clues.push({text:`${itemName(ch)} is matched with ${itemName(target)}.`, a:ch, b:target});
  }));
  const flavor = characters.map(ch => {
    const parts = cats.slice(1).map(cat => itemName(solution[ch.id][cat.key]));
    return `${itemName(ch)}'s order includes ${parts.join(', ')}.`;
  });
  return shuffle(clues).slice(0, Math.max(6, clues.length - 1)).map(c => c.text).concat(choice(flavor));
}
function key(a,b){ return [a.id,b.id].sort().join('|'); }
function setMark(a,b,val){ state.marks.set(key(a,b), val); }
function getMark(a,b){ return state.marks.get(key(a,b)) || ''; }
function isCorrectPair(a,b){
  const p = state.puzzle;
  const char = a.category === 'characters' ? a : b.category === 'characters' ? b : null;
  if(char){ const other = char === a ? b : a; return p.solution[char.id]?.[other.category]?.id === other.id; }
  const ownerA = p.characters.find(ch => p.solution[ch.id][a.category]?.id === a.id);
  const ownerB = p.characters.find(ch => p.solution[ch.id][b.category]?.id === b.id);
  return ownerA && ownerB && ownerA.id === ownerB.id;
}
function render(){ renderCards(); renderClues(); renderGrid(); document.getElementById('celebration').classList.add('hidden'); }
function renderCards(){
  document.getElementById('order-cards').innerHTML = state.puzzle.characters.map(c => `<article class="order-card"><strong>${itemName(c)}</strong><div><span class="tag">${c.country}</span><span class="tag">${c.heightDisplay}</span><span class="tag">likes ${c.likes.join(' & ')}</span><span class="tag">${c.hobby}</span></div></article>`).join('');
}
function renderClues(){ document.getElementById('clues').innerHTML = state.puzzle.clues.map(c => `<li>${c}</li>`).join(''); }
function renderGrid(){
  const cats = state.puzzle.cats;
  document.getElementById('grid-board').innerHTML = cats.flatMap((rowCat, ri) => cats.slice(ri+1).map(colCat => matrix(rowCat,colCat))).join('');
  document.querySelectorAll('.cell').forEach(cell => {
    const a = findItem(cell.dataset.a), b = findItem(cell.dataset.b);
    const sync = val => { cell.textContent = val === 'yes' ? '✓' : val === 'x' ? '×' : ''; cell.className = `cell ${val}`; cell.setAttribute('aria-label', `${itemName(a)} and ${itemName(b)}: ${val || 'blank'}`); };
    sync(getMark(a,b));
    cell.addEventListener('click', () => { const next = { '':'x', x:'yes', yes:'' }[getMark(a,b)]; setMark(a,b,next); sync(next); });
    cell.addEventListener('pointerdown', e => { state.dragging = true; cell.setPointerCapture(e.pointerId); });
    cell.addEventListener('pointerenter', () => { if(state.dragging && !getMark(a,b)){ setMark(a,b,'x'); sync('x'); } });
    cell.addEventListener('pointerup', () => state.dragging = false);
  });
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
  const rows = state.puzzle.characters.map(ch => `<li>${itemName(ch)} receives ${state.puzzle.cats.slice(1).map(cat => itemName(state.puzzle.solution[ch.id][cat.key])).join(' + ')}.</li>`).join('');
  const box=document.getElementById('celebration'); box.innerHTML = `<h2>🦋 Sparkly deliveries complete! ✨</h2><ul>${rows}</ul><p>Kitty tied every bouquet with care, and the shoppe glowed with happy blooms.</p>`; box.classList.remove('hidden'); setStatus('Puzzle complete!');
}
function setStatus(msg){ document.getElementById('status').textContent = msg; }
async function init(){
  seed = await fetch('kitty_flower_shoppe_content_seed.json').then(r => r.json());
  const customerCount = document.getElementById('customer-count');
  const categoryCount = document.getElementById('category-count');
  document.getElementById('new-game-form').addEventListener('submit', e => { e.preventDefault(); state.marks.clear(); state.puzzle = newPuzzle(+customerCount.value, +categoryCount.value); render(); setStatus('New puzzle ready.'); });
  document.getElementById('auto-fill').addEventListener('click', autoFill);
  document.getElementById('check').addEventListener('click', check);
  document.getElementById('reveal').addEventListener('click', reveal);
  state.puzzle = newPuzzle(4,3); render();
}
init().catch(() => setStatus('Could not load the flower shoppe content seed.')); 
