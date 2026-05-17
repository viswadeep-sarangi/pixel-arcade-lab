// Host Dashboard Logic

let currentRoomId = null;
let currentCategory = null;
let quizStarted = false;
let hostId = null;
let quizQuestions = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
});

/**
 * Create a new quiz room
 */
function createRoom() {
    if (!window.database) {
        alert('Firebase is not configured. Please add your Firebase project settings, including databaseURL, to config.local.js.');
        return;
    }

    const category = document.getElementById('categorySelect').value;

    if (!category) {
        alert('Please select a category');
        return;
    }

    currentRoomId = 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    currentCategory = category;
    quizStarted = false;

    const roomData = {
        hostId: hostId,
        category: category,
        status: 'waiting',
        currentQuestionIndex: 0,
        questionPhase: 'waiting',
        createdAt: new Date().toISOString(),
        players: {}
    };

    window.database.ref('rooms/' + currentRoomId).set(roomData)
      .then(() => {
        console.log('Room created successfully');
        showRoomInfo();
        listenForRoomUpdates();
      })
      .catch((error) => {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
      });
}

/**
 * Show room information
 */
function showRoomInfo() {
    document.getElementById('creationSection').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';
    document.getElementById('playersSection').style.display = 'block';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('roomIdDisplay').textContent = currentRoomId;
    document.getElementById('categoryDisplay').textContent = currentCategory;
}

/**
 * Listen for room updates including players and quiz state
 */
function listenForRoomUpdates() {
    database.ref('rooms/' + currentRoomId).on('value', (snapshot) => {
        const roomData = snapshot.val() || {};
        const players = roomData.players || {};
        updatePlayersList(players);
        updateRoomUI(roomData, players);
    });
}

/**
 * Update players list in UI
 */
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    const playerIds = Object.keys(players);

    if (playerIds.length === 0) {
        playersList.innerHTML = '<div class="no-players">Waiting for players to join...</div>';
        document.getElementById('startButton').disabled = true;
    } else {
        let html = '';
        playerIds.forEach((playerId) => {
            const player = players[playerId];
            const completedQuestions = player.completedQuestions || 0;
            html += `
                <div class="player-item">
                    <div class="player-name">
                        <span class="status-indicator ${player.hasSubmitted ? 'status-completed' : 'status-waiting'}"></span>
                        ${player.name}
                    </div>
                    <div class="player-progress">
                        Questions Completed: ${completedQuestions}/${quizQuestions.length || 5}
                    </div>
                </div>
            `;
        });
        playersList.innerHTML = html;
        document.getElementById('startButton').disabled = false;
    }
}

/**
 * Update host UI based on room state
 */
function updateRoomUI(roomData, players) {
    const quizSection = document.getElementById('quizSection');
    const hostSubmitStatus = document.getElementById('hostSubmitStatus');
    const startButton = document.getElementById('startButton');
    const endButton = document.getElementById('endButton');

    if (roomData.status !== 'started') {
        quizSection.style.display = 'none';
        startButton.disabled = Object.keys(players).length === 0;
        endButton.disabled = true;
        return;
    }

    quizSection.style.display = 'block';
    startButton.disabled = true;
    endButton.disabled = false;

    if (quizQuestions.length === 0) {
        loadQuestionsForHost(roomData.category).then(() => {
            renderHostQuestion(roomData, players);
        });
        return;
    }

    renderHostQuestion(roomData, players);
}

/**
 * Load questions for the host
 */
function loadQuestionsForHost(category) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const categoryData = data.categories.find(cat => cat.topic === category);
            if (categoryData) {
                quizQuestions = categoryData.questions;
            } else {
                quizQuestions = [];
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            quizQuestions = [];
        });
}

/**
 * Render host question and player answer status
 */
function renderHostQuestion(roomData, players) {
    const currentIndex = roomData.currentQuestionIndex || 0;
    const phase = roomData.questionPhase || 'waiting';
    const question = quizQuestions[currentIndex];
    const hostQuestionText = document.getElementById('hostQuestionText');
    const hostOptionsGrid = document.getElementById('hostOptionsGrid');
    const playerCardsContainer = document.getElementById('playerCardsContainer');
    const hostPlayersTop = document.getElementById('hostPlayersTop');
    const completeBtn = document.getElementById('completeQuestionButton');
    const revealBtn = document.getElementById('revealAnswerButton');
    const nextBtn = document.getElementById('nextQuestionButton');

    if (!question) {
        hostQuestionText.textContent = 'No questions loaded yet.';
        hostOptionsGrid.innerHTML = '';
        playerCardsContainer.innerHTML = '';
        return;
    }

    hostQuestionText.textContent = `Q${currentIndex + 1}: ${question.question}`;

    const optionHtml = question.options.map((option, index) => {
        const isCorrect = roomData.questionPhase === 'revealed' && question.correctAnswer === index;
        const classes = ['host-option-tile'];
        if (isCorrect) classes.push('correct');
        return `
            <div class="${classes.join(' ')}" id="hostOption${index}">
                <div class="host-option-title">${String.fromCharCode(65 + index)}. ${option}</div>
                <div class="host-option-players" id="hostOptionPlayers${index}"></div>
            </div>
        `;
    }).join('');

    hostOptionsGrid.innerHTML = optionHtml;

    const playerIds = Object.keys(players);
    hostPlayersTop.innerHTML = playerIds.map((playerId) => {
        const player = players[playerId];
        return `<div class="host-player-chip ${player.hasSubmitted ? 'submitted' : ''}"><span class="tick"></span>${player.name}</div>`;
    }).join('');

    const allAnswered = playerIds.length > 0 && playerIds.every((playerId) => players[playerId].hasSubmitted);
    completeBtn.disabled = !(allAnswered && phase === 'open');
    revealBtn.disabled = phase !== 'complete';

    const lastQuestion = currentIndex >= quizQuestions.length - 1;
    nextBtn.disabled = phase !== 'revealed';
    nextBtn.textContent = lastQuestion ? 'Finish Quiz' : 'Next Question';

    const playerCards = playerIds.map((playerId) => {
        const player = players[playerId];
        const statusText = player.hasSubmitted ? 'Submitted' : 'Waiting';
        const answerText = typeof player.currentAnswer === 'number' ? `Option ${String.fromCharCode(65 + player.currentAnswer)}` : 'No answer yet';
        return `
            <div class="host-player-card ${player.hasSubmitted ? 'submitted' : ''}">
                <div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-status">${statusText}</div>
                </div>
                <div>${phase === 'open' ? answerText : answerText}</div>
            </div>
        `;
    }).join('');
    playerCardsContainer.innerHTML = playerCards;

    if (phase !== 'open') {
        Object.values(players).forEach((player) => {
            if (typeof player.currentAnswer === 'number') {
                const target = document.getElementById(`hostOptionPlayers${player.currentAnswer}`);
                if (target) {
                    const card = document.createElement('div');
                    card.textContent = player.name;
                    card.style.padding = '0.35rem 0.5rem';
                    card.style.borderRadius = '4px';
                    card.style.background = '#fff';
                    card.style.marginTop = '0.35rem';
                    card.style.fontSize = '0.9rem';
                    target.appendChild(card);
                }
            }
        });
    }

    if (phase === 'open') {
        hostSubmitStatus.textContent = `Waiting for players to submit their answers. ${playerIds.filter(id => players[id].hasSubmitted).length}/${playerIds.length} submitted.`;
    } else if (phase === 'complete') {
        hostSubmitStatus.textContent = 'All players have submitted. Click Complete Question to move cards to the selected answers.';
    } else if (phase === 'revealed') {
        hostSubmitStatus.textContent = 'Answer revealed. Click Next Question to continue.';
    }
}

/**
 * Start the quiz
 */
function startQuiz() {
    if (!currentRoomId) {
        alert('No room created');
        return;
    }

    if (!currentCategory) {
        alert('Missing category');
        return;
    }

    loadQuestionsForHost(currentCategory)
      .then(() => {
          if (!quizQuestions.length) {
              alert('Could not load questions for this category.');
              return;
          }

          database.ref('rooms/' + currentRoomId).update({
              status: 'started',
              startedAt: new Date().toISOString(),
              currentQuestionIndex: 0,
              questionPhase: 'open'
          })
          .then(() => {
              console.log('Quiz started');
              document.getElementById('startButton').disabled = true;
              document.getElementById('endButton').disabled = false;
          })
          .catch((error) => {
              console.error('Error starting quiz:', error);
          });
      });
}

/**
 * Complete the current question by moving player cards to options
 */
function completeQuestion() {
    if (!currentRoomId) return;
    database.ref('rooms/' + currentRoomId).update({
        questionPhase: 'complete'
    }).catch((error) => console.error('Error completing question:', error));
}

/**
 * Reveal the correct answer
 */
function revealAnswer() {
    if (!currentRoomId) return;
    database.ref('rooms/' + currentRoomId).update({
        questionPhase: 'revealed'
    }).catch((error) => console.error('Error revealing answer:', error));
}

/**
 * Advance to the next question or finish quiz
 */
function nextQuestion() {
    if (!currentRoomId) return;
    database.ref('rooms/' + currentRoomId).once('value').then((snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) return;

        const nextIndex = (roomData.currentQuestionIndex || 0) + 1;
        const isLastQuestion = nextIndex >= quizQuestions.length;

        if (isLastQuestion) {
            endSession();
            return;
        }

        const playerResets = {};
        const players = roomData.players || {};
        Object.keys(players).forEach((playerId) => {
            playerResets[`players/${playerId}/hasSubmitted`] = false;
            playerResets[`players/${playerId}/currentAnswer`] = null;
        });

        const updates = {
            currentQuestionIndex: nextIndex,
            questionPhase: 'open',
            ...playerResets
        };

        database.ref('rooms/' + currentRoomId).update(updates)
          .catch((error) => console.error('Error advancing question:', error));
    });
}

/**
 * End the quiz session
 */
function endSession() {
    if (!currentRoomId) {
        alert('No room to end');
        return;
    }

    database.ref('rooms/' + currentRoomId).update({
      status: 'ended',
      endedAt: new Date().toISOString()
    })
    .then(() => {
      console.log('Quiz ended');
      displayResults();
    })
    .catch((error) => {
      console.error('Error ending quiz:', error);
    });
}

/**
 * Display quiz results and answers
 */
function displayResults() {
    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    loadQuestionsForReview();
}

/**
 * Load questions for review
 */
function loadQuestionsForReview() {
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const categoryData = data.categories.find(cat => cat.topic === currentCategory);
            if (categoryData) {
                displayQuestionsReview(categoryData.questions);
            }
        })
        .catch(error => console.error('Error loading questions:', error));
}

/**
 * Display questions review
 */
function displayQuestionsReview(questions) {
    let html = '';
    
    questions.forEach((question, index) => {
        const correctAnswer = question.options[question.correctAnswer];
        html += `
            <div class="question-review">
                <div class="question-text">Q${index + 1}: ${question.question}</div>
                <div class="answer-options">
                    ${question.options.map((option, optIndex) => `
                        <div class="answer-option ${optIndex === question.correctAnswer ? 'correct-answer' : ''}">
                            ${String.fromCharCode(65 + optIndex)}. ${option}
                            ${optIndex === question.correctAnswer ? ' ✓ (Correct)' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    document.getElementById('resultsContent').innerHTML = html;
}

/**
 * Reset the room to create a new one
 */
function resetRoom() {
    database.ref('rooms/' + currentRoomId).remove();

    currentRoomId = null;
    currentCategory = null;
    quizStarted = false;
    quizQuestions = [];

    document.getElementById('creationSection').style.display = 'block';
    document.getElementById('roomInfo').style.display = 'none';
    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('categorySelect').value = '';
    document.getElementById('playersList').innerHTML = '<div class="no-players">Waiting for players to join...</div>';
}

/**
 * Go back to main page
 */
function goBack() {
    if (currentRoomId && !confirm('Are you sure you want to leave? The room will be deleted.')) {
        return;
    }

    if (currentRoomId) {
      database.ref('rooms/' + currentRoomId).remove();
    }

    window.location.href = 'index.html';
}

/**
 * Simulate a player joining (for testing)
 */
function simulatePlayerJoin(playerName) {
    if (!currentRoomId) return;
    
    const playerId = 'player_' + Date.now();
    const playerData = {
        name: playerName,
        joinedAt: new Date().toISOString(),
        completedQuestions: 0,
        answers: []
    };

    // database.ref('rooms/' + currentRoomId + '/players/' + playerId).set(playerData);
}
