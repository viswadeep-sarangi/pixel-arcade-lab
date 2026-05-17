// Host Dashboard Logic

let currentRoomId = null;
let currentCategory = null;
let quizStarted = false;
let hostId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Generate a unique host ID
    hostId = 'host_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
});

/**
 * Create a new quiz room
 */
function createRoom() {
    const category = document.getElementById('categorySelect').value;

    if (!category) {
        alert('Please select a category');
        return;
    }

    // Generate Room ID
    currentRoomId = 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
    currentCategory = category;
    quizStarted = false;

    // TODO: Firebase - Create room entry in database
    // Structure:
    // rooms/{roomId} = {
    //   hostId: hostId,
    //   category: category,
    //   status: "waiting",
    //   createdAt: timestamp,
    //   players: {}
    // }

    const roomData = {
        hostId: hostId,
        category: category,
        status: "waiting",
        createdAt: new Date().toISOString(),
        players: {}
    };

    // Firebase call placeholder:
    database.ref('rooms/' + currentRoomId).set(roomData)
      .then(() => {
        console.log("Room created successfully");
        showRoomInfo();
        listenForPlayers();
      })
      .catch((error) => {
        console.error("Error creating room:", error);
        alert("Error creating room. Please try again.");
      });

    // For now, simulate successful room creation
    showRoomInfo();
    listenForPlayers();
}

/**
 * Show room information
 */
function showRoomInfo() {
    document.getElementById('creationSection').style.display = 'none';
    document.getElementById('roomInfo').style.display = 'block';
    document.getElementById('playersSection').style.display = 'block';
    document.getElementById('roomIdDisplay').textContent = currentRoomId;
    document.getElementById('categoryDisplay').textContent = currentCategory;
}

/**
 * Listen for players joining the room
 */
function listenForPlayers() {
    // TODO: Firebase - Set up real-time listener for players joining
    database.ref('rooms/' + currentRoomId + '/players').on('value', (snapshot) => {
      const players = snapshot.val() || {};
      updatePlayersList(players);
    });

    // Simulate players joining (for testing)
    // Remove this in production
    // setTimeout(() => {
    //   simulatePlayerJoin('Player 1');
    // }, 2000);
}

/**
 * Update players list in UI
 */
function updatePlayersList(players) {
    const playersList = document.getElementById('playersList');
    
    if (Object.keys(players).length === 0) {
        playersList.innerHTML = '<div class="no-players">Waiting for players to join...</div>';
        document.getElementById('startButton').disabled = true;
    } else {
        let html = '';
        Object.values(players).forEach(player => {
            const completedQuestions = player.completedQuestions || 0;
            const status = player.completedQuestions === 5 ? 'completed' : 'waiting';
            const statusText = player.completedQuestions === 5 ? 'Completed' : 'In Progress';
            
            html += `
                <div class="player-item">
                    <div class="player-name">
                        <span class="status-indicator status-${status}"></span>
                        ${player.name}
                    </div>
                    <div class="player-progress">
                        Questions Completed: ${completedQuestions}/5
                    </div>
                </div>
            `;
        });
        playersList.innerHTML = html;
        document.getElementById('startButton').disabled = false;
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

    quizStarted = true;
    
    // TODO: Firebase - Update room status to "started"
    database.ref('rooms/' + currentRoomId).update({
      status: "started",
      startedAt: new Date().toISOString()
    })
    .then(() => {
      console.log("Quiz started");
      document.getElementById('startButton').disabled = true;
      document.getElementById('endButton').disabled = false;
    })
    .catch((error) => {
      console.error("Error starting quiz:", error);
    });

    alert('Quiz has started! Players will now see the first question.');
    document.getElementById('startButton').disabled = true;
    document.getElementById('endButton').disabled = false;
}

/**
 * End the quiz session
 */
function endSession() {
    if (!currentRoomId) {
        alert('No room to end');
        return;
    }

    // TODO: Firebase - Update room status to "ended"
    database.ref('rooms/' + currentRoomId).update({
      status: "ended",
      endedAt: new Date().toISOString()
    })
    .then(() => {
      console.log("Quiz ended");
      displayResults();
    })
    .catch((error) => {
      console.error("Error ending quiz:", error);
    });

    displayResults();
}

/**
 * Display quiz results and answers
 */
function displayResults() {
    // TODO: Firebase - Fetch all player answers and compile results
    database.ref('rooms/' + currentRoomId + '/players').once('value', (snapshot) => {
      const players = snapshot.val() || {};
      // Process and display results
    });

    document.getElementById('playersSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    
    // Load questions
    loadQuestionsForReview();
}

/**
 * Load questions for review
 */
function loadQuestionsForReview() {
    // TODO: Firebase - Fetch questions for the current category from database
    // or use the local questions.json
    
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
    // TODO: Firebase - Clean up current room or mark as archived
    database.ref('rooms/' + currentRoomId).remove();

    currentRoomId = null;
    currentCategory = null;
    quizStarted = false;

    document.getElementById('creationSection').style.display = 'block';
    document.getElementById('roomInfo').style.display = 'none';
    document.getElementById('playersSection').style.display = 'none';
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
    
    // TODO: Firebase - Delete the room if leaving early
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

    // TODO: Remove this in production - only for testing
    // database.ref('rooms/' + currentRoomId + '/players/' + playerId).set(playerData);
}
