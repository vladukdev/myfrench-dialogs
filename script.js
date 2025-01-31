// State management
let currentDialog = null;
let isPlaying = false;
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
let config = null;

// UI translations
const translations = {
    en: {
        title: 'French Learning Dialogs',
        back: '← Back to Menu',
        translation: 'Translation',
        play: 'Play',
        pause: 'Pause',
        restart: 'Restart'
    },
    uk: {
        title: 'Вивчення французької мови',
        back: '← Повернутися до меню',
        translation: 'Переклад',
        play: 'Відтворити',
        pause: 'Пауза',
        restart: 'Спочатку'
    }
};

// DOM Elements
let menuContainer, studyContainer, dialogList, backButton, audioPlayer,
    playPauseButton, restartButton, progressBar, languageSelect;

// Initialize DOM references
function initializeDOMElements() {
    menuContainer = document.getElementById('menu-container');
    studyContainer = document.getElementById('study-container');
    dialogList = document.getElementById('dialog-list');
    backButton = document.getElementById('back-button');
    audioPlayer = document.getElementById('audio-player');
    playPauseButton = document.getElementById('play-pause');
    restartButton = document.getElementById('restart');
    progressBar = document.getElementById('progress-bar');
    languageSelect = document.getElementById('language-select');

    if (!menuContainer || !studyContainer) {
        console.error('Critical DOM elements are missing');
        return false;
    }
    return true;
}

// Highlight both French and translation sentences
function highlightPair(index) {
    const frenchSentences = document.querySelectorAll('#french-text .sentence');
    const translationSentences = document.querySelectorAll('#translation-text .sentence');

    if (!frenchSentences.length || !translationSentences.length) return;

    // Remove active class from all sentences
    frenchSentences.forEach(s => s.classList.remove('active'));
    translationSentences.forEach(s => s.classList.remove('active'));

    // Add active class to specific sentences
    if (index >= 0 && index < frenchSentences.length && index < translationSentences.length) {
        frenchSentences[index].classList.add('active');
        translationSentences[index].classList.add('active');

        // Smooth scroll to the active sentences
        frenchSentences[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        translationSentences[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Initialize language selector
function initializeLanguageSelector() {
    if (!languageSelect || !config || !config.languages) return;

    // Clear existing options
    languageSelect.innerHTML = '';

    Object.entries(config.languages).forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        option.selected = code === currentLanguage;
        languageSelect.appendChild(option);
    });

    languageSelect.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        localStorage.setItem('preferredLanguage', currentLanguage);
        updateUILanguage();
        if (currentDialog) {
            renderDialog(currentDialog);
        } else {
            renderDialogList(config.dialogs);
        }
    });
}

// Update UI text based on selected language
function updateUILanguage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

// Set up click handlers for sentences
function setupSentenceHandlers() {
    const frenchSentences = document.querySelectorAll('#french-text .sentence');
    const translationSentences = document.querySelectorAll('#translation-text .sentence');

    frenchSentences.forEach((sentence, index) => {
        sentence.addEventListener('click', () => {
            const start = parseFloat(sentence.dataset.start);
            if (audioPlayer) audioPlayer.currentTime = start;
            highlightPair(index);
        });
    });

    translationSentences.forEach((sentence, index) => {
        sentence.addEventListener('click', () => {
            const start = parseFloat(frenchSentences[index].dataset.start);
            if (audioPlayer) audioPlayer.currentTime = start;
            highlightPair(index);
        });
    });
}

// Load configuration and initialize the app
async function initializeApp() {
    try {
        const response = await fetch('config.json');
        config = await response.json();

        // Initialize DOM elements
        if (!initializeDOMElements()) {
            return;
        }

        // Initialize language selector
        initializeLanguageSelector();

        // Update UI language
        updateUILanguage();

        // Render dialog list
        renderDialogList(config.dialogs);

        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error loading configuration:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    if (!backButton || !playPauseButton || !restartButton || !progressBar || !audioPlayer) {
        console.error('Required DOM elements for event listeners are missing');
        return;
    }

    // Back button
    backButton.addEventListener('click', () => {
        audioPlayer.pause();
        isPlaying = false;
        playPauseButton.textContent = translations[currentLanguage].play;
        showMainMenu();
    });

    // Play/Pause button
    playPauseButton.addEventListener('click', () => {
        if (isPlaying) {
            audioPlayer.pause();
            playPauseButton.textContent = translations[currentLanguage].play;
        } else {
            audioPlayer.play();
            playPauseButton.textContent = translations[currentLanguage].pause;
        }
        isPlaying = !isPlaying;
    });

    // Restart button
    restartButton.addEventListener('click', () => {
        audioPlayer.currentTime = 0;
        progressBar.value = 0;
        highlightPair(0);
    });

    // Progress bar
    progressBar.addEventListener('input', () => {
        const time = (progressBar.value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = time;
    });

    // Audio player events
    audioPlayer.addEventListener('timeupdate', () => {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.value = progress;

        const frenchSentences = document.querySelectorAll('#french-text .sentence');
        frenchSentences.forEach((sentence, index) => {
            const start = parseFloat(sentence.dataset.start);
            const end = parseFloat(sentence.dataset.end);

            if (audioPlayer.currentTime >= start && audioPlayer.currentTime < end) {
                highlightPair(index);
            }
        });
    });

    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        playPauseButton.textContent = translations[currentLanguage].play;
    });
}

// View management functions
function showMainMenu() {
    menuContainer.classList.remove('hidden');
    studyContainer.classList.add('hidden');
}

function showStudyView() {
    menuContainer.classList.add('hidden');
    studyContainer.classList.remove('hidden');
}

// Render the list of available dialogs
function renderDialogList(dialogs) {
    if (!dialogList) return;

    dialogList.innerHTML = dialogs.map(dialog => `
        <div class="dialog-card" data-dialog-id="${dialog.id}" data-dialog-file="${dialog.file}">
            <h2>${dialog.title}</h2>
            <p>${dialog.description[currentLanguage]}</p>
        </div>
    `).join('');

    document.querySelectorAll('.dialog-card').forEach(card => {
        card.addEventListener('click', () => loadDialog(card.dataset.dialogFile));
    });
}

// Load and display a specific dialog
async function loadDialog(dialogFile) {
    try {
        const response = await fetch(dialogFile);
        currentDialog = await response.json();

        audioPlayer.src = currentDialog.audio;
        renderDialog(currentDialog);
        showStudyView();

        audioPlayer.currentTime = 0;
        progressBar.value = 0;
        isPlaying = false;
        playPauseButton.textContent = translations[currentLanguage].play;
    } catch (error) {
        console.error('Error loading dialog:', error);
    }
}

function setupSynchronizedScrolling() {
    const frenchPanel = document.getElementById('french-panel');
    const translationPanel = document.getElementById('translation-panel');

    // Synchronize scrolling
    frenchPanel.addEventListener('scroll', () => {
        translationPanel.scrollTop = frenchPanel.scrollTop;
    });

    translationPanel.addEventListener('scroll', () => {
        frenchPanel.scrollTop = translationPanel.scrollTop;
    });
}

// Render the dialog content
function renderDialog(dialog) {
    const frenchText = document.getElementById('french-text');
    const translationText = document.getElementById('translation-text');

    if (!frenchText || !translationText) return;

    frenchText.innerHTML = dialog.sentences.map(sentence => `
        <p class="sentence" data-start="${sentence.start}" data-end="${sentence.end}">
            ${sentence.french}
        </p>
    `).join('');

    translationText.innerHTML = dialog.sentences.map(sentence => `
        <p class="sentence">${sentence.translation[currentLanguage]}</p>
    `).join('');

    setupSentenceHandlers();
    // Add synchronized scrolling
    setupSynchronizedScrolling();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);