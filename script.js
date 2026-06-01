// ===== Configuration =====
const CONFIG = {
  startDate: new Date('2026-02-13'),
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
  const startDate = new Date(CONFIG.startDate);
  if (startDate.getDay() !== 6) return [];
  
  for (let week = 0; week < CONFIG.weeks; week++) {
    const saturday = new Date(startDate);
    saturday.setDate(startDate.getDate() + (week * 7));
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
  }
  return dates;
}

// ===== Modal Functions =====
let elements = {};

function showModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function hideModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
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
    
    dateVotes.forEach(vote => {
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.innerHTML = `
        <span class="avatar-emoji">${vote.avatar}</span>
        <span class="pseudo">${vote.pseudo}</span>
        <span class="date">${dateLabel}</span>
        <button class="delete-vote" title="Supprimer">❌</button>
      `;
      
      card.querySelector('.delete-vote').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer le vote de ${vote.pseudo} ?`)) {
          const idx = State.votes.findIndex(v => v.pseudo === vote.pseudo && v.date === vote.date && v.avatar === vote.avatar);
          if (idx !== -1) { State.removeVote(idx); displayResults(); }
        }
      });
      container.appendChild(card);
    });
  });
}

// ===== Handle Form Submission =====
function handleSubmit() {
  const selectedAvatar = document.querySelector('input[name="avatar"]:checked');
  const selectedDateBtn = document.querySelector('.date-btn.selected');
  const pseudo = document.getElementById('pseudo').value.trim();
  
  if (!selectedAvatar || !selectedDateBtn || !pseudo) {
    alert('⚠️ Il faut choisir un avatar, une date ET un pseudo !');
    return;
  }
  
  State.addVote({
    avatar: selectedAvatar.value,
    date: selectedDateBtn.dataset.date,
    pseudo: pseudo
  });
  displayResults();
  
  // Reset
  document.getElementById('pseudo').value = '';
  document.querySelectorAll('input[name="avatar"]').forEach(r => r.checked = false);
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
  
  // Show IBAN modal
  showModal(document.getElementById('iban-modal'));
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
    exportBtn: document.getElementById('export-btn')
  };
  
  // Inject animations
  injectKeyframes();
  
  // Initialize
  initDates();
  initAnimation();
  displayResults();
  initModalListeners();
  
  // Event Listeners
  elements.submitBtn.addEventListener('click', handleSubmit);
  elements.exportBtn.addEventListener('click', () => State.exportVotes());
  elements.pseudoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSubmit(); });
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
