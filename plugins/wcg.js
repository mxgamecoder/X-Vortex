// import { bot } from '../lib/plugins.js';
// import Wcg from './bot/wcg.js';

// const games = new Map();

// bot(
// 	{
// 		pattern: 'wcg',
// 		isPublic: true,
// 		desc: 'Play Word Chain Game',
// 		type: 'games',
// 	},
// 	async message => {
// 		const chatId = message.jid;
// 		const user = message.sender;

// 		if (games.has(chatId)) {
// 			return await message.send('```❌ A game is already in progress in this chat!```');
// 		}

// 		const game = new Wcg();
// 		games.set(chatId, game);

// 		await message.send('```🎮 Word Chain Game is starting!\n⏳ You have 30 seconds to join.\n📝 Send "join" to participate!```');

// 		const result = await game.startJoinPhase(
// 			async countdownMessage => {
// 				await message.send(countdownMessage);
// 			},
// 			{
// 				id: user,
// 				name: message.pushName || 'Player',
// 			},
// 		);

// 		if (result.status === 'failed') {
// 			games.delete(chatId);
// 			return await message.send('```❌ Not enough players joined the game!```');
// 		}

// 		await message.send(`\`\`\`🎮 Game Started!\n📝 First word: ${result.firstWord}\n👤 It's ${game.players.get(result.currentPlayer).name}'s turn!\n⏳ You have 30 seconds to respond\`\`\``);
// 	},
// );

// bot(
// 	{
// 		on: 'text',
// 		dontAddCommandList: true,
// 	},
// 	async message => {
// 		const chatId = message.jid;
// 		const user = message.sender;
// 		const text = message.text.toLowerCase();

// 		if (!games.has(chatId)) return;

// 		const game = games.get(chatId);

// 		if (game.gameState === 'waiting' && text === 'join') {
// 			const joined = game.addPlayer(user, message.pushName || 'Player');
// 			if (joined) {
// 				await message.send(`\`\`\`✅ ${message.pushName} joined the game!\`\`\``);
// 			}
// 			return;
// 		}

// 		if (game.gameState === 'playing' && game.currentPlayer === user) {
// 			const result = await game.playerMove(user, text);

// 			if (!result) return;

// 			if (result.status === 'ended') {
// 				if (result.winner) {
// 					await message.send(`\`\`\`🏆 Game Over!\n👑 Winner: ${result.winner.name}\n🎯 Points: ${result.winner.points}\`\`\``);
// 				} else {
// 					await message.send('```❌ Game Over! No winners!```');
// 				}
// 				games.delete(chatId);
// 				return;
// 			}

// 			const nextPlayer = game.players.get(result.nextPlayer);
// 			await message.send(`\`\`\`✅ Valid word!\n📝 Current word: ${result.currentWord}\n🎯 Points: ${result.points}\n👤 It's ${nextPlayer.name}'s turn!\n⏳ You have 30 seconds to respond\`\`\``);
// 		}
// 	},
// );
