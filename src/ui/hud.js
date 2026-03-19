export function createUI() {
  const $ = (id) => document.getElementById(id);
  const refs = {
    hud: $('hud'), startMenu: $('startMenu'), nameModal: $('nameModal'), speedValue: $('speedValue'), scoreValue: $('scoreValue'), multiplierValue: $('multiplierValue'), damageValue: $('damageValue'), damageBar: $('damageBar'), leaderboardList: $('leaderboardList'), comboPanel: $('comboPanel'), comboValue: $('comboValue'), comboText: $('comboText'), statusText: $('statusText'), playerNameInput: $('playerNameInput'), playBtn: $('playBtn'), clearScoresBtn: $('clearScoresBtn'), saveScoreBtn: $('saveScoreBtn'), skipScoreBtn: $('skipScoreBtn')
  };
  return {
    refs,
    showGame() { refs.startMenu.classList.add('hidden'); refs.hud.classList.add('visible'); },
    setStatus(html) { refs.statusText.innerHTML = html; },
    updateHUD(physics) {
      refs.speedValue.textContent = Math.round(physics.state.speed * 6.1);
      refs.scoreValue.textContent = Math.round(physics.game.score).toLocaleString();
      refs.multiplierValue.textContent = `x${physics.game.combo.toFixed(1)} combo`;
      refs.damageValue.textContent = `${Math.round(physics.state.damage)}%`;
      refs.damageBar.style.width = `${physics.state.damage}%`;
      const drifting = physics.game.comboHold > 0.05;
      refs.comboPanel.classList.toggle('active', drifting);
      refs.comboValue.textContent = drifting ? `+${Math.round(physics.game.combo * 10)}` : '+0';
      refs.comboText.textContent = drifting ? `Combo x${physics.game.combo.toFixed(1)}` : 'Hold angle for bonus';
    },
    renderBoard(entries) {
      refs.leaderboardList.innerHTML = '';
      if (!entries.length) {
        const li = document.createElement('li'); li.innerHTML = '<span>No runs saved</span><strong>0</strong>'; refs.leaderboardList.appendChild(li); return;
      }
      entries.forEach((entry, idx) => { const li = document.createElement('li'); li.innerHTML = `<span>${idx + 1}. ${entry.name}</span><strong>${entry.score.toLocaleString()}</strong>`; refs.leaderboardList.appendChild(li); });
    },
    showSaveModal(defaultName) { refs.playerNameInput.value = defaultName; refs.nameModal.classList.remove('hidden'); },
    hideSaveModal() { refs.nameModal.classList.add('hidden'); }
  };
}
