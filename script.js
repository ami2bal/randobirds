// ===== Configuration =====
const CONFIG = {
  startDate: new Date('2026-06-13'),  // Rando à partir du 13 juin 2026 (4 week-ends : sam + dim)
  weeks: 4,
  avatars: [
    { emoji: '🦊', name: 'Firefox', desc: 'CCO' },
    { emoji: '🐍', name: 'Snake', desc: 'Botaniste à l\'ombre' },
    { emoji: '🐼', name: 'Panda', desc: 'Espèce protégée' },
    { emoji: '🐗', name: 'Wildboar', desc: 'Jambon de service' },
    { emoji: '🦅', name: 'Eagle', desc: 'Gourmet à viscères' }
  ]
};

// ===== Stockage distant persistant (SANS DB à installer) =====
// Utilise Firebase Realtime Database (plan gratuit Spark suffit largement).
// URL configurée avec le projet que tu as créé.
const REMOTE_VOTES_URL = 'https://randobirds-oche-default-rtdb.europe-west1.firebasedatabase.app/votes.json';

// ⚠️ Rappel : Va dans Firebase → Realtime Database → onglet "Règles" et mets :
// {
//   "rules": {
//     "votes": { ".read": true, ".write": true }
//   }
// }
// Puis "Publier". Sans ça, les votes ne seront pas lisibles/écrivables.


// ===== State Management (local + distant) =====
const State = {
  votes: [],
  _lastRemoteLoad: 0,

  // Charge depuis le remote (si configuré) avec fallback localStorage
  async load() {
    // Toujours avoir un cache local pour l'instantané + offline
    const cached = JSON.parse(localStorage.getItem('randoVotes') || '[]');
    this.votes = Array.isArray(cached) ? cached : [];

    if (!REMOTE_VOTES_URL) {
      return;
    }

    try {
      const res = await fetch(REMOTE_VOTES_URL);
      if (res.ok) {
        const data = await res.json();
        this.votes = Array.isArray(data) ? data : [];
        localStorage.setItem('randoVotes', JSON.stringify(this.votes));
        this._lastRemoteLoad = Date.now();
      }
    } catch (e) {
      // On garde le cache local, pas de panique pour un sondage d'équipe
      console.warn('[State] Impossible de charger les votes distants, utilisation du cache local.', e);
    }
  },

  // Sauvegarde locale + push distant si activé
  async save() {
    localStorage.setItem('randoVotes', JSON.stringify(this.votes));

    if (!REMOTE_VOTES_URL) return;

    try {
      await fetch(REMOTE_VOTES_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.votes)
      });
    } catch (e) {
      console.warn('[State] Sauvegarde distante échouée (votes gardés en local).', e);
    }
  },

  // Ajout "safe" : read-modify-write quand remote est actif (évite les écrasements)
  async addVotes(newVotes) {
    if (!REMOTE_VOTES_URL) {
      newVotes.forEach(v => this.votes.push(v));
      await this.save();
      return;
    }

    try {
      // 1. Récupérer l'état le plus frais
      let current = [];
      try {
        const res = await fetch(REMOTE_VOTES_URL);
        if (res.ok) {
          const d = await res.json();
          current = Array.isArray(d) ? d : [];
        }
      } catch (_) { /* on continue avec ce qu'on a */ }

      // 2. Ajouter seulement les nouveaux (par id)
      const existingIds = new Set(current.map(v => v.id).filter(Boolean));
      for (const nv of newVotes) {
        if (!nv.id || !existingIds.has(nv.id)) {
          current.push(nv);
          existingIds.add(nv.id);
        }
      }

      this.votes = current;

      // 3. Écrire l'ensemble
      await fetch(REMOTE_VOTES_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.votes)
      });
      localStorage.setItem('randoVotes', JSON.stringify(this.votes));
    } catch (e) {
      // Fallback : on ajoute en local seulement
      console.warn('[State] addVotes distant a échoué, fallback local uniquement.', e);
      newVotes.forEach(v => this.votes.push(v));
      await this.save(); // save local seulement (REMOTE est down)
    }
  },

  async removeVote(index) {
    if (index < 0 || index >= this.votes.length) return;
    const removed = this.votes.splice(index, 1)[0];

    if (!REMOTE_VOTES_URL) {
      await this.save();
      return;
    }

    // Pour la suppression on refait un read-modify-write pour cohérence
    try {
      let current = [];
      const res = await fetch(REMOTE_VOTES_URL);
      if (res.ok) {
        const d = await res.json();
        current = Array.isArray(d) ? d : [];
      }

      // Retirer par id si possible, sinon fallback sur l'objet
      const idx = current.findIndex(v =>
        (removed.id && v.id === removed.id) ||
        (v.pseudo === removed.pseudo && v.date === removed.date && v.avatar === removed.avatar)
      );
      if (idx !== -1) current.splice(idx, 1);

      this.votes = current;
      await fetch(REMOTE_VOTES_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.votes)
      });
      localStorage.setItem('randoVotes', JSON.stringify(this.votes));
    } catch (e) {
      await this.save(); // au moins le local est à jour
    }
  },

  async clearAll() {
    this.votes = [];
    await this.save();
  },

  exportVotes() {
    const data = JSON.stringify(this.votes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `votes-rando-oche-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ===== Date Generation =====
function generateDates() {
  const dates = [];
  let cursor = new Date(CONFIG.startDate);
  
  // Trouve le premier samedi à partir de (ou après) la date de référence
  const startDay = cursor.getDay(); // 0=dim, 1=lun ... 6=sam
  const daysToNextSat = (6 - startDay + 7) % 7;
  cursor.setDate(cursor.getDate() + daysToNextSat);
  
  for (let week = 0; week < CONFIG.weeks; week++) {
    const saturday = new Date(cursor);
    dates.push({
      date: saturday.toISOString().split('T')[0],
      label: saturday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      day: 'samedi'
    });
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    dates.push({
      date: sunday.toISOString().split('T')[0],
      label: sunday.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      day: 'dimanche'
    });
    
    // semaine suivante
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

// ===== Modal Functions =====
let elements = {};
let deleteConfirmResolver = null;

function showModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus management (2026 a11y)
  const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable) setTimeout(() => focusable.focus(), 50);
}

function hideModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function cuteConfirm(question) {
  return new Promise((resolve) => {
    const modal = document.getElementById('delete-confirm-modal');
    const text = document.getElementById('delete-confirm-text');
    if (!modal || !text) {
      resolve(confirm(question)); // fallback
      return;
    }
    text.textContent = question;
    deleteConfirmResolver = resolve;
    showModal(modal);
  });
}

function initDeleteConfirmListeners() {
  const modal = document.getElementById('delete-confirm-modal');
  const yesBtn = document.getElementById('delete-confirm-yes');
  const noBtn = document.getElementById('delete-confirm-no');
  
  if (!modal || !yesBtn || !noBtn) return;
  
  yesBtn.addEventListener('click', () => {
    hideModal(modal);
    if (deleteConfirmResolver) {
      deleteConfirmResolver(true);
      deleteConfirmResolver = null;
    }
  });
  
  noBtn.addEventListener('click', () => {
    hideModal(modal);
    if (deleteConfirmResolver) {
      deleteConfirmResolver(false);
      deleteConfirmResolver = null;
    }
  });
  
  // Click outside cancels
  modal.addEventListener('click', (e) => {
    if (e.target === modal && deleteConfirmResolver) {
      hideModal(modal);
      deleteConfirmResolver(false);
      deleteConfirmResolver = null;
    }
  });
}

// ===== Animation Functions =====
function initAnimation() {
  const climbers = document.querySelectorAll('.climber');
  climbers.forEach((climber, index) => {
    const duration = 15 + (index * 3);
    const delay = index * 2;
    climber.style.animation = `climb ${duration}s linear infinite`;
    climber.style.animationDelay = `${delay}s`;
  });
}

// ===== Initialize Dates =====
function initDates() {
  const dates = generateDates();
  const container = document.getElementById('date-buttons');
  
  dates.forEach(date => {
    const btn = document.createElement('button');
    btn.className = 'date-btn';
    btn.textContent = date.label;
    btn.dataset.date = date.date;
    btn.dataset.day = date.day;
    
    // Multi-sélection (plusieurs dates possibles)
    btn.onclick = () => {
      btn.classList.toggle('selected');
      updateSubmitState();
    };
    
    container.appendChild(btn);
  });
  return dates;
}

// ===== Display Results =====
function displayResults() {
  const votes = State.votes;
  const container = document.getElementById('vote-results');
  
  if (votes.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun vote pour l\'instant... 😢</p>';
    return;
  }
  
  const votesByDate = votes.reduce((acc, vote) => {
    if (!acc[vote.date]) acc[vote.date] = [];
    acc[vote.date].push(vote);
    return acc;
  }, {});
  
  // Trier par popularité (nombre de votes décroissant)
  const sortedDates = Object.keys(votesByDate).sort((a, b) => {
    return votesByDate[b].length - votesByDate[a].length;
  });
  
  container.innerHTML = '';
  
  sortedDates.forEach(date => {
    const dateVotes = votesByDate[date];
    const count = dateVotes.length;
    const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    
    // Carte date + popularité
    const dateBlock = document.createElement('div');
    dateBlock.className = 'date-result-block';
    
    const percentage = Math.round((count / votes.length) * 100);
    
    dateBlock.innerHTML = `
      <div class="date-result-header">
        <div class="date-info">
          <span class="date-label">${dateLabel}</span>
          <span class="popularity">${count} vote${count > 1 ? 's' : ''} <span class="percent">(${percentage}%)</span></span>
        </div>
        <div class="popularity-bar">
          <div class="bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
      
      <div class="voters">
        ${dateVotes.map(vote => `
          <div class="voter" data-vote-id="${vote.id}">
            <span class="avatar">${vote.avatar}</span>
            <span class="name">${vote.pseudo}</span>
            <button class="delete-vote-small" title="Supprimer ce vote">×</button>
          </div>
        `).join('')}
      </div>
    `;
    
    // Gestion suppression individuelle
    dateBlock.querySelectorAll('.delete-vote-small').forEach((btn, i) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const vote = dateVotes[i];
        const shouldDelete = await cuteConfirm(`Supprimer le vote de ${vote.pseudo} pour cette date ?`);
        if (shouldDelete) {
          let idx = State.votes.findIndex(v => v.id && v.id === vote.id);
          if (idx === -1) {
            idx = State.votes.findIndex(v => v.pseudo === vote.pseudo && v.date === vote.date && v.avatar === vote.avatar);
          }
          if (idx !== -1) {
            await State.removeVote(idx);
            displayResults();
          }
        }
      });
    });
    
    container.appendChild(dateBlock);
  });
}

// ===== Form UX (2026 best practices + kawaii) =====
function updateSubmitState() {
  const hasAvatar = !!document.querySelector('input[name="avatar"]:checked');
  const hasAtLeastOneDate = document.querySelectorAll('.date-btn.selected').length > 0;
  const hasPseudo = document.getElementById('pseudo').value.trim().length >= 2;
  const btn = document.getElementById('submit');
  if (btn) btn.disabled = !(hasAvatar && hasAtLeastOneDate && hasPseudo);
}

function showFormFeedback(message, isError = true) {
  const fb = document.getElementById('form-feedback');
  if (!fb) return;
  fb.textContent = message;
  fb.style.color = isError ? 'var(--color-danger)' : 'var(--color-success)';
  fb.style.fontSize = '0.875rem';
  fb.style.marginTop = '0.5rem';
  fb.style.fontWeight = '600';
  
  // Auto clear after a bit for non-errors
  if (!isError) {
    setTimeout(() => { if (fb) fb.textContent = ''; }, 2200);
  }
}

function clearFormFeedback() {
  const fb = document.getElementById('form-feedback');
  if (fb) fb.textContent = '';
}

async function handleVoteSubmit(e) {
  if (e) e.preventDefault();
  
  const selectedAvatar = document.querySelector('input[name="avatar"]:checked');
  const selectedDateBtns = Array.from(document.querySelectorAll('.date-btn.selected'));
  const pseudoInput = document.getElementById('pseudo');
  const pseudo = pseudoInput.value.trim();
  
  if (!selectedAvatar || selectedDateBtns.length === 0 || !pseudo) {
    showFormFeedback('⚠️ Avatar, au moins une date ET pseudo (2 caractères min) sont obligatoires !');
    
    if (!selectedAvatar) {
      document.querySelector('.avatars-grid')?.classList.add('needs-attention');
      setTimeout(() => document.querySelector('.avatars-grid')?.classList.remove('needs-attention'), 1200);
    } else if (selectedDateBtns.length === 0) {
      document.getElementById('date-buttons')?.classList.add('needs-attention');
      setTimeout(() => document.getElementById('date-buttons')?.classList.remove('needs-attention'), 1200);
    }
    return;
  }
  
  // Pour chaque date sélectionnée → un vote séparé (on veut compter les préférences par date)
  const baseId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const newVotes = selectedDateBtns.map((btn, index) => ({
    id: baseId + '-' + index,
    avatar: selectedAvatar.value,
    date: btn.dataset.date,
    pseudo: pseudo
  }));

  await State.addVotes(newVotes);

  displayResults();
  clearFormFeedback();
  
  // Cute success micro-feedback
  const nbDates = selectedDateBtns.length;
  showFormFeedback(`Parfait ! ${nbDates} date${nbDates > 1 ? 's' : ''} enregistrée${nbDates > 1 ? 's' : ''} 🥾`, false);
  
  // Reset form
  pseudoInput.value = '';
  document.querySelectorAll('input[name="avatar"]').forEach(r => r.checked = false);
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
  updateSubmitState();
  
  // The legendary IBAN flow (kept for the kawaii personality)
  setTimeout(() => {
    showModal(document.getElementById('iban-modal'));
  }, 650);
}

// ===== Handle IBAN Modal =====
function initModalListeners() {
  const ibanInput = document.getElementById('iban-input');
  const acceptCheckbox = document.getElementById('accept-checkbox');
  
  // Annuler IBAN
  document.getElementById('cancel-iban').addEventListener('click', () => {
    hideModal(document.getElementById('iban-modal'));
    showModal(document.getElementById('confirm-cancel-modal'));
  });
  
  // Valider IBAN
  document.getElementById('validate-iban').addEventListener('click', () => {
    if (!acceptCheckbox.checked) {
      alert('⚠️ Tu dois cocher "J\'accepte" !');
      return;
    }
    if (!ibanInput.value.trim()) {
      alert('⚠️ Il faut renseigner un IBAN !');
      return;
    }
    hideModal(document.getElementById('iban-modal'));
    showModal(document.getElementById('validation-modal'));
    ibanInput.value = '';
    acceptCheckbox.checked = false;
  });
  
  // Valider dans confirmation annulation
  document.getElementById('confirm-cancel-validate').addEventListener('click', () => {
    hideModal(document.getElementById('confirm-cancel-modal'));
    showModal(document.getElementById('validation-modal'));
  });
  
  // Annuler dans confirmation annulation
  document.getElementById('confirm-cancel-cancel').addEventListener('click', () => {
    hideModal(document.getElementById('confirm-cancel-modal'));
    showModal(document.getElementById('final-cancel-modal'));
  });
  
  // Fermer modals
  document.getElementById('close-final-cancel').addEventListener('click', () => 
    hideModal(document.getElementById('final-cancel-modal')));
  document.getElementById('close-validation').addEventListener('click', () => 
    hideModal(document.getElementById('validation-modal')));
  
  // Fermer en cliquant dehors
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(modal); });
  });
}

// ===== CSS Keyframes =====
function injectKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes climb {
      0% { transform: translateX(0) translateY(0); }
      100% { transform: translateX(100px) translateY(-80px); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ===== Initialize App =====
async function init() {
  // Charge d'abord les votes distants (ou local) AVANT d'afficher quoi que ce soit
  await State.load();

  // Cache elements
  elements = {
    dateButtons: document.getElementById('date-buttons'),
    voteResults: document.getElementById('vote-results'),
    pseudoInput: document.getElementById('pseudo'),
    submitBtn: document.getElementById('submit'),
    exportBtn: document.getElementById('export-btn'),
    voteForm: document.getElementById('vote-form')
  };
  
  // Inject animations
  injectKeyframes();
  
  // Initialize
  initDates();
  // Note: new relaxed hike animation is pure CSS (no JS needed)
  displayResults();
  initModalListeners();
  initDeleteConfirmListeners();
  
  // Modern form handling + live validation (2026 UX)
  if (elements.voteForm) {
    elements.voteForm.addEventListener('submit', handleVoteSubmit);
  }
  
  // Live enable/disable of submit button (best practice)
  const avatarRadios = document.querySelectorAll('input[name="avatar"]');
  avatarRadios.forEach(r => r.addEventListener('change', updateSubmitState));
  
  if (elements.dateButtons) {
    // Use event delegation for future-proof + clean
    elements.dateButtons.addEventListener('click', (e) => {
      if (e.target.classList.contains('date-btn')) {
        updateSubmitState();
      }
    });
  }
  
  if (elements.pseudoInput) {
    elements.pseudoInput.addEventListener('input', updateSubmitState);
    elements.pseudoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !elements.submitBtn.disabled) {
        // Let the form handler do it
      }
    });
  }
  
  elements.exportBtn.addEventListener('click', () => State.exportVotes());
  
  // Refresh results from remote (useful to see votes des potes rapidement)
  const refreshBtn = document.getElementById('refresh-results-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const oldCount = State.votes.length;
      await State.load();
      displayResults();
      if (State.votes.length !== oldCount) {
        // petit feedback visuel optionnel
        refreshBtn.textContent = '✓ mis à jour';
        setTimeout(() => { if (refreshBtn) refreshBtn.textContent = 'rafraîchir'; }, 1200);
      }
    });
  }

  // Clear all votes (with cute confirm)
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (State.votes.length === 0) return;
      const ok = await cuteConfirm('Effacer TOUS les votes de ce sondage ?');
      if (ok) {
        await State.clearAll();
        displayResults();
      }
    });
  }
  
  // Initial state
  updateSubmitState();

  // Met à jour le petit texte sous les résultats selon le mode de stockage
  const storageNote = document.getElementById('storage-note');
  if (storageNote) {
    storageNote.textContent = REMOTE_VOTES_URL
      ? 'Votes partagés de façon persistante (multi-appareils)'
      : 'Votes sauvegardés localement dans ton navigateur uniquement';
  }

  // Polling léger pour voir les votes des autres (toutes les ~20s) quand remote activé
  if (REMOTE_VOTES_URL) {
    setInterval(async () => {
      try {
        const before = State.votes.length;
        await State.load();
        if (State.votes.length !== before) {
          displayResults();
        }
      } catch (_) {}
    }, 20000);
  }
  
  // Global Escape for modals (accessibility 2026)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const active = document.querySelector('.modal.active');
      if (active) hideModal(active);
    }
  });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('Init error', err);
    // Fallback: on essaie quand même d'initialiser ce qu'on peut
    initDates();
    displayResults();
  });
});
