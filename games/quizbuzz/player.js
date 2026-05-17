// Player Logic

let currentRoomId = null;
let playerId = null;
let playerName = null;
let currentQuestionIndex = 0;
let selectedAnswer = null;
let playerAnswers = [];
let quizQuestions = [];
let quizStarted = false;

/**
 * Join a quiz room
 */
function joinRoom() {
    const roomId = document.getElementById('roomId').value.trim().toUpperCase();
    const name = document.getElementById('playerName').value.trim();

    if (!roomId || !name) {
        alert('Please enter both Room ID and your name');
        return;
    }

    currentRoomId = roomId;
    playerName = name;
    playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // TODO: Firebase - Verify room exists and add player to it
    database.ref('rooms/' + roomId).once('value', (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
        const playerData = {
          name: playerName,
          joinedAt: new Date().toISOString(),
          completedQuestions: 0,
          answers: []
        };
        database.ref('rooms/' + roomId + '/players/' + playerId).set(playerData)
          .then(() => {
            showWaitingScreen();
            listenForQuizStart();
          })
          .catch(error => {
            console.error("Error joining room:", error);
            alert("Error joining room. Please try again.");
          });
      } else {
        alert("Room not found. Please check the Room ID.");
      }
    });
}

/**
 * Show waiting screen
 */
function showWaitingScreen() {
    document.getElementById('joinScreen').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'block';
    document.getElementById('displayRoomId').textContent = currentRoomId;
    document.getElementById('displayPlayerName').textContent = playerName;
}

/**
 * Listen for quiz start signal from host
 */
function listenForQuizStart() {
    // TODO: Firebase - Listen for room status change to "started"
    database.ref('rooms/' + currentRoomId).on('value', (snapshot) => {
      const roomData = snapshot.val();
      if (roomData && roomData.status === 'started' && !quizStarted) {
        quizStarted = true;
        loadQuizQuestions(roomData.category);
      }
    });
}

/**
 * Load quiz questions for the category
 */
function loadQuizQuestions(category = null) {
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            // TODO: Firebase - Use category from room data
            // For now, use a default category or passed category
            const selectedCategory = category || 'Geography';
            
            const categoryData = data.categories.find(cat => cat.topic === selectedCategory);
            if (categoryData) {
                quizQuestions = categoryData.questions;
                playerAnswers = new Array(quizQuestions.length).fill(null);
                showQuizScreen();
            }
        })
        .catch(error => console.error('Error loading questions:', error));
}

/**
 * Show quiz screen
 */
function showQuizScreen() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    displayCurrentQuestion();
}

/**
 * Display current question
 */
function displayCurrentQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        completeQuiz();
        return;
    }

    const question = quizQuestions[currentQuestionIndex];
    
    // Update progress
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    // Display question number and text
    document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;

    // Display options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = String.fromCharCode(65 + index) + '. ' + option;
        button.onclick = () => selectAnswer(index);
        
        // Restore previously selected answer
        if (playerAnswers[currentQuestionIndex] === index) {
            button.classList.add('selected');
        }
        
        optionsContainer.appendChild(button);
    });

    // Update next button state
    const nextButton = document.getElementById('nextButton');
    nextButton.disabled = playerAnswers[currentQuestionIndex] === null;
    
    if (currentQuestionIndex === quizQuestions.length - 1) {
        nextButton.textContent = 'Submit Quiz';
    } else {
        nextButton.textContent = 'Next Question';
    }

    selectedAnswer = playerAnswers[currentQuestionIndex];
}

/**
 * Select an answer option
 */
function selectAnswer(optionIndex) {
    selectedAnswer = optionIndex;
    playerAnswers[currentQuestionIndex] = optionIndex;

    // Update UI
    const options = document.querySelectorAll('.option-button');
    options.forEach((btn, index) => {
        if (index === optionIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Enable next button
    document.getElementById('nextButton').disabled = false;

    // TODO: Firebase - Update progress on host dashboard
    database.ref('rooms/' + currentRoomId + '/players/' + playerId + '/completedQuestions')
      .set(Math.max(playerAnswers.filter(a => a !== null).length));
}

/**
 * Submit answer and move to next question
 */
function submitAnswer() {
    if (selectedAnswer === null) {
        alert('Please select an answer');
        return;
    }

    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    } else {
        completeQuiz();
    }
}

/**
 * Complete the quiz
 */
function completeQuiz() {
    // TODO: Firebase - Save all answers to database
    database.ref('rooms/' + currentRoomId + '/players/' + playerId).update({
      answers: playerAnswers,
      completedQuestions: quizQuestions.length,
      completedAt: new Date().toISOString()
    })
    .then(() => {
      console.log("Answers saved");
      showResultsScreen();
    })
    .catch(error => {
      console.error("Error saving answers:", error);
    });

    showResultsScreen();
}

/**
 * Show results screen
 */
function showResultsScreen() {
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';

    // TODO: Firebase - Listen for host to display results
    database.ref('rooms/' + currentRoomId).on('value', (snapshot) => {
      const roomData = snapshot.val();
      if (roomData && roomData.status === 'ended') {
        displayFinalResults();
      }
    });
}

/**
 * Go back to main page
 */
function goBack() {
    // TODO: Firebase - Remove player from room
    if (currentRoomId && playerId) {
      database.ref('rooms/' + currentRoomId + '/players/' + playerId).remove();
    }

    window.location.href = 'index.html';
}
