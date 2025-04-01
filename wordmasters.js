const TOTAL_ATTEMPTS = 6;

let state = {
  targetWord: null,
  guesses: [], // { word: string, correctness?: string }[]
  currentGuess: {word: ''},
  hasWon: false,
  hasLost: false
}

function patchState(newState) {
  state = {...state, ...newState};
  rerender();
}

function rerender() {
  console.log(state);
  if (state.hasWon) {
    document.querySelector('h1').classList.add('winning-colors');
    document.querySelector('.winning-banner').style.visibility = 'visible';
  }
  if (state.hasLost) {
    document.querySelector('.losing-banner .target-word').innerText = state.targetWord;
    document.querySelector('.losing-banner').style.visibility = 'visible';
  }
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (state.isLoading) {
    loadingOverlay.style.visibility = 'visible';
  } else {
    loadingOverlay.style.visibility = 'hidden';
  }
  renderLetters();
}

function renderLetters() {
  const wordElements = document.querySelectorAll('.words .word');
  [...state.guesses, state.currentGuess].slice(0, TOTAL_ATTEMPTS).forEach((guess, i) => {
    const wordNode = wordElements.item(i);
    wordNode.classList.remove('current');
    if (i === state.guesses.length) {
      wordNode.classList.add('current');
    }
    wordNode.querySelectorAll('.letter').forEach(letterBox => letterBox.innerHTML = ''); // clear
    [...guess.word].forEach((letter, i) => {
      const letterElement = wordNode.querySelectorAll('.letter').item(i);
      letterElement.innerText = letter;
      if (guess.correctness?.[i] === 'c') {
        letterElement.classList.add('correct');
      } else if (guess.correctness?.[i] === 'p') {
        letterElement.classList.add('partially-correct');
      } else if (guess.correctness?.[i] === 'i') {
        letterElement.classList.add('incorrect');
      }
    });
  });
}

async function init() {
  patchState({isLoading: true});
  const response = await fetch('https://words.dev-apis.com/word-of-the-day');
  const targetWordResponse = await response.json();
  patchState({isLoading: false, targetWord: targetWordResponse.word});
  handleKeydown();
}

function handleKeydown() {
  document.addEventListener('keydown', (event) => {
    if (state.hasLost || state.hasWon || state.isLoading) {
      return;
    }
    if (event.key === 'Backspace') {
      const currentWord = state.currentGuess.word;
      patchState({currentGuess: {word: currentWord.substring(0, currentWord.length - 1)}});
    }
    if (event.key === 'Enter' && state.currentGuess.word.length === 5) {
      checkCurrentGuess();
    }
    if (isLetter(event.key) && state.currentGuess.word.length < 5) {
      const letter = event.key.toLowerCase();
      patchState({currentGuess: {word: state.currentGuess.word + letter}});
    }
  });
}

async function checkCurrentGuess() {
  patchState({isLoading: true});
  const word = state.currentGuess.word;
  const isValidResponse = await fetch('https://words.dev-apis.com/validate-word', {
    method: 'POST',
    body: JSON.stringify({word})
  });
  const isValidJson = await isValidResponse.json();
  patchState({isLoading: false});
  if (!isValidJson.validWord) {
    alert(`${state.currentGuess.word} is not a valid word.`);
    return;
  }
  processGuess();
}

function processGuess() {
  const guess = state.currentGuess;
  const correctness = checkCorrectness(guess.word, state.targetWord);
  if (guess.word === state.targetWord) {
    patchState({
      guesses: [...state.guesses, {...guess, correctness}],
      currentGuess: {word: ''},
      hasWon: true
    });
    return;
  }
  const newGuesses = [...state.guesses, {word: guess.word, correctness}];
  patchState({
    guesses: newGuesses,
    currentGuess: {word: ''},
    hasLost: newGuesses.length === TOTAL_ATTEMPTS
  });
}

/**
 * Returns a string of length = word.length where each letter in the result string is either
 * 'c' -> correct letter and pos, 'p' -> correct letter incorrect pos, or 'i' -> letter not present
 */
function checkCorrectness(word, target) {
  const letters = [...word];
  let correctness = letters.map(() => 'i');
  const letterCounts = [...target].reduce((acc, curr) => {
    acc[curr] = acc[curr] || 0;
    acc[curr] += 1;
    return acc;
  }, {});
  // first pass -> test correct letter and position
  letters.forEach((letter, i) => {
    if (letter === target[i]) {
      correctness[i] = 'c';
      letterCounts[letter]--;
    }
  });
  // second pass, test presence
  letters.forEach((letter, i) => {
    if (letter === target[i]) {
      // do nothing, already processed above
    } else if (letterCounts[letter]) {
      correctness[i] = 'p';
      letterCounts[letter]--;
    }
  });
  return correctness;
}

function isLetter(letter) {
  return /^[a-zA-Z]$/.test(letter);
}

init();