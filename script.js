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
  exportBtn: document.getElementById('export-btn')
};

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
          // Trouver l'index global du vote
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
  
  // Focus on pseudo input for next vote
  elements.pseudoInput.focus();
  
  alert(`✅ ${pseudo} a voté pour le ${selectedDateBtn.dataset.day} ${new Date(selectedDateBtn.dataset.date).toLocaleDateString('fr-FR')} !`);
}

// ===== Initialize App =====
function init() {
  // Generate and display dates
  const dates = initDates();
  
  // Display initial results
  displayResults();
  
  // Event Listeners
  elements.submitBtn.addEventListener('click', handleSubmit);
  elements.exportBtn.addEventListener('click', () => State.exportVotes());
  
  // Allow Enter key to submit
  elements.pseudoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
