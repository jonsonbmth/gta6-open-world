// Save/load + garage shop, kept separate from the render loop.
import { saveGame, loadSave } from './state.js';

export function autosave(state) {
  return saveGame(state);
}

export function hasSave() {
  return loadSave() !== null;
}

export function garageItems(state) {
  return [
    { key: '1', name: 'Engine tune', desc: `Level ${state.upgrades.engine + 1} — more top speed`, price: 1500 + state.upgrades.engine * 1200, can: state.money >= 1500 + state.upgrades.engine * 1200 },
    { key: '2', name: 'Armour plating', desc: `Level ${state.upgrades.armour + 1} — tougher car`, price: 1200 + state.upgrades.armour * 1000, can: state.money >= 1200 + state.upgrades.armour * 1000 },
    { key: '3', name: 'Respray', desc: 'Fresh paint — rotate the colour', price: 400, can: state.money >= 400 },
    { key: '4', name: 'Lose the heat', desc: 'Lena calls in a favour — wanted level cleared', price: 800, can: state.money >= 800 && state.wanted > 0 },
  ];
}

export function buyGarageItem(state, key) {
  const items = garageItems(state);
  const item = items.find((i) => i.key === key);
  if (!item || !item.can) return null;
  state.money -= item.price;
  if (key === '1') state.upgrades.engine += 1;
  if (key === '2') { state.upgrades.armour += 1; state.carCondition = 100; }
  if (key === '3') state.paint = (state.paint + 1) % 4;
  if (key === '4') state.wanted = 0;
  saveGame(state);
  return item;
}
