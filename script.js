// ===== Configuration =====
const CONFIG = {
  // Dates fixes à partir du 13 février 2026 (samedi)
  startDate: new Date('2026-02-13'), // Samedi 13 février 2026
  weeks: 4, // 4 week-ends
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
  
  save() {
    localStorage.setItem('randoVotes', JSON.stringify(this.votes));
  },
  
  addVote(vote) {
    this.votes.push(vote);
    this.save();
  },
  
  removeVote(index) {
    this.votes.splice(index, 1);
    this.save();
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
  const startDate = new Date(CONFIG.startDate);
  
  // Vérifie que c'est bien un samedi
  if (startDate.getDay() !== 6) {
    console.error('La date de départ doit être un samedi !');
    return [];
  }
  
  for (let week = 0; week < CONFIG.weeks; week++) {
    const saturday = new Date(startDate);
    saturday.setDate(startDate.getDate() + (week * 7));
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    dates.push({
      date: saturday.toISOString().split('T')[0],
      label: saturday.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric' 
      }),
      day: 'samedi'
    });
    
    dates.push({
      date: sunday.toISOString().split('T')[0],
      label: sunday.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric' 
      }),
      day: 'dimanche'
    });
  }
  
  return dates;
}

// ===== DOM Elements =====
const elements = {
  dateButtons: document.getElementById('date-buttons'),
  voteResults: document.getElementById('vote-results'),
  pseudoInput: document.getElementById('pseudo'),
  submitBtn: document.getElementById('submit'),
  exportBtn: document.getElementById('export-btn'),
  // Modal elements
  ibanModal: document.getElementById('iban-modal'),
  confirmCancelModal: document.getElementById('confirm-cancel-modal'),
  finalCancelModal: document.getElementById('final-cancel-modal'),
  validationModal: document.getElementById('validation-modal'),
  cancelIbanBtn: document.getElementById('cancel-iban'),
  validateIbanBtn: document.getElementById('validate-iban'),
  confirmCancelValidateBtn: document.getElementById('confirm-cancel-validate'),
  confirmCancelCancelBtn: document.getElementById('confirm-cancel-cancel'),
  closeFinalCancelBtn: document.getElementById('close-final-cancel'),
  closeValidationBtn: document.getElementById('close-validation')
};

// ===== Modal Functions =====
function showModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hideModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function hideAllModals() {
  [elements.ibanModal, elements.confirmCancelModal, elements.finalCancelModal, elements.validationModal].forEach(hideModal);
}

// ===== Animation Functions =====
function initAnimation() {
  // Animer les grimpeurs
  const climbers = document.querySelectorAll('.climber');
  climbers.forEach((climber, index) => {
    const duration = 10 + (index * 3); // Durée différente pour chaque
    climber.style.animation = `climb ${duration}s linear infinite`;
  });
  
  // Animer les rochers
  const rocks = document.querySelectorAll('.rock');
  rocks.forEach((rock, index) => {
    const delay = index * 2;
    const duration = 8 + (index * 2);
    rock.style.animation = `fall ${duration}s linear infinite`;
    rock.style.animationDelay = `${delay}s`;
  });
}

// ===== Initialize Dates =====
function initDates() {
  const dates = generateDates();
  
  // Crée les boutons de date
  dates.forEach(date => {
    const btn = document.createElement('button');
    btn.className = 'date-btn';
    btn.textContent = date.label;
    btn.dataset.date = date.date;
    btn.dataset.day = date.day;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-btn').forEach(b => {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
    });
    elements.dateButtons.appendChild(btn);
  });
  
  return dates;
}

// ===== Display Results =====
function displayResults() {
  const votes = State.votes;
  
  if (votes.length === 0) {
    elements.voteResults.innerHTML = '<p class="empty-state">Aucun vote pour l\'instant... 😢</p>';
    return;
  }
  
  // Grouper les votes par date
  const votesByDate = votes.reduce((acc, vote) => {
    if (!acc[vote.date]) acc[vote.date] = [];
    acc[vote.date].push(vote);
    return acc;
  }, {});
  
  // Trier les votes par date
  const sortedDates = Object.keys(votesByDate).sort();
  
  elements.voteResults.innerHTML = '';
  
  sortedDates.forEach(date => {
    const dateVotes = votesByDate[date];
    const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
    
    dateVotes.forEach((vote, index) => {
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.dataset.index = index;
      card.dataset.date = date;
      card.innerHTML = `
        <span class="avatar-emoji">${vote.avatar}</span>
        <span class="pseudo">${vote.pseudo}</span>
        <span class="date">${dateLabel}</span>
        <button class="delete-vote" aria-label="Supprimer le vote de ${vote.pseudo}" title="Supprimer">❌</button>
      `;
      
      // Ajouter l'événement de suppression
      const deleteBtn = card.querySelector('.delete-vote');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer le vote de ${vote.pseudo} ?`)) {
          const globalIndex = State.votes.findIndex(v => 
            v.pseudo === vote.pseudo && v.date === vote.date && v.avatar === vote.avatar
          );
          if (globalIndex !== -1) {
            State.removeVote(globalIndex);
            displayResults();
          }
        }
      });
      
      elements.voteResults.appendChild(card);
    });
  });
}

// ===== Handle Form Submission =====
function handleSubmit() {
  const selectedAvatar = document.querySelector('input[name="avatar"]:checked');
  const selectedDateBtn = document.querySelector('.date-btn.selected');
  const pseudo = elements.pseudoInput.value.trim();
  
  if (!selectedAvatar || !selectedDateBtn || !pseudo) {
    alert('⚠️ Il faut choisir un avatar, une date ET un pseudo !');
    return;
  }
  
  const vote = {
    avatar: selectedAvatar.value,
    date: selectedDateBtn.dataset.date,
    pseudo: pseudo
  };
  
  State.addVote(vote);
  displayResults();
  
  // Reset form
  elements.pseudoInput.value = '';
  document.querySelectorAll('input[name="avatar"]').forEach(r => r.checked = false);
  document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('selected'));
  
  // Afficher la popup IBAN
  showModal(elements.ibanModal);
}

// ===== Handle IBAN Modal =====
function initModalListeners() {
  // Annuler IBAN
  elements.cancelIbanBtn.addEventListener('click', () => {
    hideModal(elements.ibanModal);
    showModal(elements.confirmCancelModal);
  });
  
  // Valider IBAN (vérification basique)
  elements.validateIbanBtn.addEventListener('click', () => {
    const ibanInput = document.getElementById('iban-input');
    const acceptCheckbox = document.getElementById('accept-checkbox');
    
    if (!acceptCheckbox.checked) {
      alert('⚠️ Tu dois cocher "J\'accepte" !');
      return;
    }
    
    if (!ibanInput.value.trim()) {
      alert('⚠️ Il faut renseigner un IBAN !');
      return;
    }
    
    hideModal(elements.ibanModal);
    showModal(elements.validationModal);
    
    // Réinitialiser les champs pour la prochaine fois
    ibanInput.value = '';
    acceptCheckbox.checked = false;
  });
  
  // Valider dans la popup de confirmation d'annulation
  elements.confirmCancelValidateBtn.addEventListener('click', () => {
    hideModal(elements.confirmCancelModal);
    showModal(elements.validationModal);
  });
  
  // Annuler dans la popup de confirmation d'annulation
  elements.confirmCancelCancelBtn.addEventListener('click', () => {
    hideModal(elements.confirmCancelModal);
    showModal(elements.finalCancelModal);
  });
  
  // Fermer la popup finale d'annulation
  elements.closeFinalCancelBtn.addEventListener('click', () => {
    hideModal(elements.finalCancelModal);
  });
  
  // Fermer la popup de validation
  elements.closeValidationBtn.addEventListener('click', () => {
    hideModal(elements.validationModal);
  });
  
  // Fermer les modals en cliquant à l'extérieur
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  });
}

// ===== Initialize App =====
function init() {
  // Generate and display dates
  const dates = initDates();
  
  // Initialize animation
  initAnimation();
  
  // Display initial results
  displayResults();
  
  // Event Listeners
  elements.submitBtn.addEventListener('click', handleSubmit);
  elements.exportBtn.addEventListener('click', () => State.exportVotes());
  
  // Modal listeners
  initModalListeners();
  
  // Allow Enter key to submit
  elements.pseudoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
}

// ===== CSS Keyframes (injecté dynamiquement) =====
const style = document.createElement('style');
style.textContent = `
  @keyframes climb {
    0% { transform: translate(0, 0); }
    100% { transform: translate(-100px, -100px); }
  }
  
  @keyframes fall {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
    100% { transform: translate(0, 200px) rotate(720deg); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
