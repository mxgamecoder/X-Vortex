// class Wcg {
// 	constructor() {
// 		this.players = new Map();
// 		this.isGameActive = false;
// 		this.currentWord = '';
// 		this.currentPlayer = null;
// 		this.usedWords = new Set();
// 		this.difficulty = 1;
// 		this.timer = null;
// 		this.joinTimer = null;
// 		this.gameState = 'waiting';
// 		this.countdownInterval = null;
// 		this.initialPlayerCount = 0; // Track initial number of players
// 	}

// 	addPlayer(playerId, playerName) {
// 		// Prevent adding players after join phase or if already in game
// 		if (this.gameState !== 'waiting' || this.players.has(playerId)) {
// 			return false;
// 		}

// 		// Add the player to the game
// 		this.players.set(playerId, {
// 			id: playerId,
// 			name: playerName,
// 			points: 0,
// 			isActive: true,
// 		});

// 		return true;
// 	}

// 	async startJoinPhase(messageCallback, initialPlayer) {
// 		if (this.isGameActive) return { status: 'failed' };

// 		this.gameState = 'waiting';
// 		this.isGameActive = true;
// 		this.players.clear();
// 		this.usedWords.clear();
// 		this.initialPlayerCount = 0;

// 		// Automatically add the initial player
// 		if (initialPlayer) {
// 			this.addPlayer(initialPlayer.id, initialPlayer.name);
// 		}

// 		let timeLeft = 30;

// 		return new Promise(resolve => {
// 			this.countdownInterval = setInterval(() => {
// 				if (timeLeft % 10 === 0) {
// 					messageCallback(`\`\`\`🎮 Time remaining to join: ${timeLeft} seconds\`\`\``);
// 				}
// 				timeLeft -= 1;
// 			}, 1000);

// 			this.joinTimer = setTimeout(() => {
// 				clearInterval(this.countdownInterval);
// 				this.checkAndStartGame(resolve);
// 			}, 30000);
// 		});
// 	}

// 	async checkAndStartGame(resolve) {
// 		const activePlayers = [...this.players.values()];

// 		// Need at least 2 players to start
// 		if (activePlayers.length < 2) {
// 			this.endGame();
// 			resolve({ status: 'failed' });
// 			return;
// 		}

// 		// Store the initial player count
// 		this.initialPlayerCount = activePlayers.length;

// 		// Select first word
// 		this.currentWord = await this.getRandomWord();

// 		// Select first player
// 		this.currentPlayer = activePlayers[0].id;
// 		this.gameState = 'playing';

// 		// Start timer for first player
// 		this.startPlayerTimer();

// 		resolve({
// 			status: 'started',
// 			firstWord: this.currentWord,
// 			currentPlayer: this.currentPlayer,
// 			players: activePlayers,
// 		});
// 	}

// 	async validateWord(word) {
// 		try {
// 			const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
// 			return response.status === 200;
// 		} catch (error) {
// 			return false;
// 		}
// 	}

// 	async getRandomWord() {
// 		try {
// 			const response = await fetch('https://random-word-api.herokuapp.com/word');
// 			const [word] = await response.json();
// 			return word;
// 		} catch (error) {
// 			// Fallback word list if API fails
// 			const fallbackWords = ['apple', 'banana', 'orange', 'mango', 'grape'];
// 			return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
// 		}
// 	}

// 	async isValidWord(word) {
// 		// Check if word has already been used
// 		if (this.usedWords.has(word)) return false;

// 		// Check if word starts with the last letter of the previous word
// 		if (!word.toLowerCase().startsWith(this.currentWord.slice(-1).toLowerCase())) return false;

// 		// Check word length
// 		if (word.length < 2) return false;

// 		// Validate word against dictionary
// 		const isValid = await this.validateWord(word);
// 		return isValid;
// 	}

// 	async playerMove(playerId, word) {
// 		if (this.gameState !== 'playing' || playerId !== this.currentPlayer) return false;

// 		// Clear the previous timer
// 		clearTimeout(this.timer);

// 		// Validate the word
// 		const isValid = await this.isValidWord(word);
// 		if (!isValid) {
// 			this.eliminatePlayer(playerId);
// 			return this.determineGameStatus();
// 		}

// 		// Update player's points
// 		const player = this.players.get(playerId);
// 		player.points += this.calculatePoints(word);
// 		this.usedWords.add(word);
// 		this.currentWord = word;
// 		this.difficulty += 0.2;

// 		// Select next player
// 		const activePlayers = [...this.players.values()].filter(p => p.isActive);
// 		const currentIndex = activePlayers.findIndex(p => p.id === playerId);
// 		this.currentPlayer = activePlayers[(currentIndex + 1) % activePlayers.length].id;

// 		// Start timer for next player
// 		this.startPlayerTimer();

// 		return {
// 			status: 'continue',
// 			nextPlayer: this.currentPlayer,
// 			currentWord: word,
// 			players: Array.from(this.players.values()),
// 			points: player.points,
// 		};
// 	}

// 	startPlayerTimer() {
// 		this.timer = setTimeout(() => {
// 			this.eliminatePlayer(this.currentPlayer);
// 			this.determineGameStatus();
// 		}, 30000);
// 	}

// 	eliminatePlayer(playerId) {
// 		const player = this.players.get(playerId);
// 		if (player) {
// 			player.isActive = false;
// 		}
// 	}

// 	determineGameStatus() {
// 		const activePlayers = [...this.players.values()].filter(p => p.isActive);

// 		// Only end the game if we started with more than 1 player
// 		// and now have only 1 or 0 players
// 		if (this.initialPlayerCount > 1 && activePlayers.length <= 1) {
// 			const winner = activePlayers.length === 1 ? activePlayers[0] : null;
// 			this.gameState = 'ended';
// 			this.isGameActive = false;
// 			return {
// 				status: 'ended',
// 				winner: winner,
// 				finalPoints: winner ? winner.points : 0,
// 			};
// 		}

// 		// If we still have multiple players, continue the game
// 		if (activePlayers.length > 1) {
// 			// Select next player
// 			this.currentPlayer = activePlayers[0].id;
// 			this.startPlayerTimer();
// 			return null;
// 		}

// 		// Fallback in case of unexpected state
// 		this.endGame();
// 		return {
// 			status: 'ended',
// 			winner: null,
// 			message: 'Game ended unexpectedly',
// 		};
// 	}

// 	calculatePoints(word) {
// 		return Math.ceil(word.length * this.difficulty);
// 	}

// 	endGame() {
// 		this.isGameActive = false;
// 		this.gameState = 'ended';
// 		this.players.clear();
// 		this.usedWords.clear();
// 		if (this.timer) clearTimeout(this.timer);
// 		if (this.joinTimer) clearTimeout(this.joinTimer);
// 	}
// }

// export default Wcg;
