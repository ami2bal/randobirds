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

// ===== State Management =====
const State = {
  votes: JSON.parse(localStorage.getItem('randoVotes')) || [],
  save() { localStorage.setItem('randoVotes', JSON.stringify(this.votes)); },
  addVote(vote) { this.votes.push(vote); this.save(); },
  removeVote(index) { this.votes.splice(index, 1); this.save(); },
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
    btn.onclick = () => {
      document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
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
  
  container.innerHTML = '';
  Object.keys(votesByDate).sort().forEach(date => {
    const dateVotes = votesByDate[date];
    const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'short'
    });
    
    // Petit header de date pour meilleure lisibilité (UX 2026)
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-group-header';
    dateHeader.innerHTML = `
      <span class="date-label">${dateLabel}</span>
      <span class="vote-count">${dateVotes.length} vote${dateVotes.length > 1 ? 's' : ''}</span>
    `;
    container.appendChild(dateHeader);
    
    dateVotes.forEach(vote => {
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.innerHTML = `
        <span class="avatar-emoji">${vote.avatar}</span>
        <span class="pseudo">${vote.pseudo}</span>
        <button class="delete-vote" title="Supprimer ce vote">❌</button>
      `;
      
      card.querySelector('.delete-vote').addEventListener('click', async (e) => {
        e.stopPropagation();
        const shouldDelete = await cuteConfirm(`Supprimer le vote de ${vote.pseudo} ?`);
        if (shouldDelete) {
          let idx = State.votes.findIndex(v => v.id && v.id === vote.id);
          if (idx === -1) {
            idx = State.votes.findIndex(v => v.pseudo === vote.pseudo && v.date === vote.date && v.avatar === vote.avatar);
          }
          if (idx !== -1) {
            State.removeVote(idx);
            displayResults();
          }
        }
      });
      container.appendChild(card);
    });
  });
}

// ===== Form UX (2026 best practices + kawaii) =====
function updateSubmitState() {
  const hasAvatar = !!document.querySelector('input[name="avatar"]:checked');
  const hasDate = !!document.querySelector('.date-btn.selected');
  const hasPseudo = document.getElementById('pseudo').value.trim().length >= 2;
  const btn = document.getElementById('submit');
  if (btn) btn.disabled = !(hasAvatar && hasDate && hasPseudo);
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

function handleVoteSubmit(e) {
  if (e) e.preventDefault();
  
  const selectedAvatar = document.querySelector('input[name="avatar"]:checked');
  const selectedDateBtn = document.querySelector('.date-btn.selected');
  const pseudoInput = document.getElementById('pseudo');
  const pseudo = pseudoInput.value.trim();
  
  if (!selectedAvatar || !selectedDateBtn || !pseudo) {
    showFormFeedback('⚠️ Avatar, date ET pseudo (2 caractères min) sont obligatoires !');
    // Highlight the first missing step cutely
    if (!selectedAvatar) {
      document.querySelector('.avatars-grid')?.classList.add('needs-attention');
      setTimeout(() => document.querySelector('.avatars-grid')?.classList.remove('needs-attention'), 1200);
    } else if (!selectedDateBtn) {
      document.getElementById('date-buttons')?.classList.add('needs-attention');
      setTimeout(() => document.getElementById('date-buttons')?.classList.remove('needs-attention'), 1200);
    }
    return;
  }
  
  // Add vote with unique id for reliable delete (2026 good practice)
  State.addVote({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    avatar: selectedAvatar.value,
    date: selectedDateBtn.dataset.date,
    pseudo: pseudo
  });
  
  displayResults();
  clearFormFeedback();
  
  // Cute success micro-feedback
  showFormFeedback('Parfait ! Rando validée 🥾', false);
  
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
function init() {
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
  
  // Clear all votes (with cute confirm)
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (State.votes.length === 0) return;
      const ok = await cuteConfirm('Effacer TOUS les votes de ce sondage ?');
      if (ok) {
        State.votes = [];
        State.save();
        displayResults();
      }
    });
  }
  
  // Initial state
  updateSubmitState();
  
  // Global Escape for modals (accessibility 2026)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const active = document.querySelector('.modal.active');
      if (active) hideModal(active);
    }
  });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
