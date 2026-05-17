// Player Logic

let currentRoomId = null;
let playerId = null;
let playerName = null;
let currentQuestionIndex = 0;
let selectedAnswer = null;
let playerAnswers = {};
let quizQuestions = [];
let quizStarted = false;
let currentRoomData = null;

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

    database.ref('rooms/' + roomId).once('value', (snapshot) => {
      if (snapshot.exists()) {
        const playerData = {
          name: playerName,
          joinedAt: new Date().toISOString(),
          completedQuestions: 0,
          currentAnswer: null,
          hasSubmitted: false,
          answers: {}
        };
        database.ref('rooms/' + roomId + '/players/' + playerId).set(playerData)
          .then(() => {
            showWaitingScreen();
            listenForRoomUpdates();
          })
          .catch(error => {
            console.error('Error joining room:', error);
            alert('Error joining room. Please try again.');
          });
      } else {
        alert('Room not found. Please check the Room ID.');
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
 * Listen for room updates from host
 */
function listenForRoomUpdates() {
    database.ref('rooms/' + currentRoomId).on('value', (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;

      const previousPhase = currentRoomData?.questionPhase;
      currentRoomData = roomData;

      if (roomData.status === 'started') {
          if (!quizStarted) {
              quizStarted = true;
              loadQuizQuestions(roomData.category).then(() => {
                  currentQuestionIndex = roomData.currentQuestionIndex || 0;
                  showQuizScreen();
              });
          } else {
              const newIndex = roomData.currentQuestionIndex || 0;
              const newPhase = roomData.questionPhase || 'open';
              const indexChanged = newIndex !== currentQuestionIndex;
              const phaseChanged = newPhase !== previousPhase;
              currentQuestionIndex = newIndex;
              if (indexChanged || phaseChanged) {
                  displayCurrentQuestion();
              }
          }
      }

      if (roomData.status === 'ended') {
          showEndScreen();
      }
    });
}

/**
 * Load quiz questions for the category
 */
function loadQuizQuestions(category = null) {
    return fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            const selectedCategory = category || 'Geography';
            const categoryData = data.categories.find(cat => cat.topic === selectedCategory);
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
 * Show quiz screen
 */
function showQuizScreen() {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    displayCurrentQuestion();
}

/**
 * Display current question and submission state
 */
function displayCurrentQuestion() {
    if (!currentRoomData || currentRoomData.status !== 'started') {
        return;
    }

    const question = quizQuestions[currentQuestionIndex];
    if (!question) {
        document.getElementById('questionNumber').textContent = '';
        document.getElementById('questionText').textContent = 'Waiting for the host to continue...';
        document.getElementById('optionsContainer').innerHTML = '';
        document.getElementById('submitButton').disabled = true;
        document.getElementById('playerStatusText').style.display = 'block';
        document.getElementById('playerStatusText').textContent = 'No active question yet.';
        return;
    }

    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('questionNumber').textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    const playerData = currentRoomData.players?.[playerId] || {};
    const hasSubmitted = playerData.hasSubmitted;
    const currentAnswer = typeof playerData.currentAnswer === 'number' ? playerData.currentAnswer : null;
    selectedAnswer = currentAnswer;

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = String.fromCharCode(65 + index) + '. ' + option;

        const phase = currentRoomData.questionPhase || 'open';
        const isSelected = index === currentAnswer;
        const shouldShowSelection = !hasSubmitted && phase === 'open' && isSelected;
        if (shouldShowSelection) button.classList.add('selected');

        if (phase !== 'open' || hasSubmitted) {
            button.disabled = true;
        } else {
            button.onclick = () => selectAnswer(index);
        }

        if (phase === 'revealed' && question.correctAnswer === index) {
            button.style.background = '#d4edda';
            button.style.borderColor = '#28a745';
            button.style.color = '#1f3d2d';
        }

        optionsContainer.appendChild(button);
    });

    const submitButton = document.getElementById('submitButton');
    const statusText = document.getElementById('playerStatusText');
    const phase = currentRoomData.questionPhase || 'open';

    if (phase === 'open') {
        if (hasSubmitted) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitted – waiting for host';
            statusText.textContent = 'Answer submitted. Please wait for the host to complete the question.';
        } else {
            submitButton.disabled = selectedAnswer === null;
            submitButton.textContent = 'Submit Answer';
            statusText.textContent = selectedAnswer === null ? 'Choose an option to submit.' : 'Ready to submit your answer.';
        }
    } else if (phase === 'complete') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for reveal';
        statusText.textContent = 'The host is moving answers to options. Please wait.';
    } else if (phase === 'revealed') {
        submitButton.disabled = true;
        submitButton.textContent = 'Waiting for next question';
        statusText.textContent = 'Correct answer revealed. The next question will begin soon.';
    }

    statusText.style.display = 'block';
}

/**
 * Select an answer option
 */
function selectAnswer(optionIndex) {
    const playerData = currentRoomData.players?.[playerId] || {};
    if (playerData.hasSubmitted || currentRoomData.questionPhase !== 'open') {
        return;
    }

    selectedAnswer = optionIndex;
    playerAnswers[currentQuestionIndex] = optionIndex;

    const options = document.querySelectorAll('.option-button');
    options.forEach((btn, index) => {
        btn.classList.toggle('selected', index === optionIndex);
    });

    document.getElementById('submitButton').disabled = false;
}

/**
 * Submit answer to Firebase
 */
function submitAnswer() {
    if (selectedAnswer === null) {
        alert('Please select an answer');
        return;
    }

    const answerUpdate = {
        currentAnswer: selectedAnswer,
        hasSubmitted: true,
        [`answers/${currentQuestionIndex}`]: selectedAnswer,
        completedQuestions: currentQuestionIndex + 1
    };

    database.ref('rooms/' + currentRoomId + '/players/' + playerId).update(answerUpdate)
      .then(() => {
          selectedAnswer = null;
          playerAnswers[currentQuestionIndex] = answerUpdate.currentAnswer;
          const optionButtons = document.querySelectorAll('.option-button');
          optionButtons.forEach((btn) => btn.classList.remove('selected'));
          displayCurrentQuestion();
      })
      .catch((error) => {
          console.error('Error submitting answer:', error);
      });
}

/**
 * Show end screen when quiz is finished
 */
function showEndScreen() {
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    document.getElementById('resultsMessage').textContent = 'Quiz completed! Waiting for host review...';
}

/**
 * Go back to main page
 */
function goBack() {
    if (currentRoomId && playerId) {
      database.ref('rooms/' + currentRoomId + '/players/' + playerId).remove();
    }

    window.location.href = 'index.html';
}
